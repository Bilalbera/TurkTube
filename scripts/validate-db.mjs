#!/usr/bin/env node
/**
 * TürkTube · Veritabanı doğrulama testleri
 * ---------------------------------------------------------------------------
 * supabase/migrations/*.sql dosyalarını gerçek bir PostgreSQL (PGlite/WASM)
 * üzerinde çalıştırır ve puan / Premium / RLS kurallarını davranış olarak test eder.
 *
 * Supabase'e özgü şemalar (auth.users, storage.*) yerel ortamda "stub"
 * olarak oluşturulur; auth.uid() ise test.edilen kullanıcıyı belirten
 * bir GUC ile taklit edilir.
 *
 * Kullanım:  npm run test:db
 */

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS = join(ROOT, "supabase", "migrations");

const U_OWNER = "22222222-2222-2222-2222-222222222222"; // video sahibi / kanal sahibi
const U_VIEWER = "33333333-3333-3333-3333-333333333333"; // izleyici
const U_STRANGER = "44444444-4444-4444-4444-444444444444"; // ilgisiz üçüncü kişi

let passCount = 0;
let failCount = 0;

function ok(name) {
  passCount += 1;
  console.log(`  PASS  ${name}`);
}

function bad(name, detail) {
  failCount += 1;
  console.log(`  FAIL  ${name}`);
  if (detail) {
    console.log(
      String(detail)
        .split("\n")
        .map((line) => `        ${line}`)
        .join("\n"),
    );
  }
}

async function expectOk(name, fn) {
  try {
    const result = await fn();
    ok(name);
    return result;
  } catch (error) {
    bad(name, error?.message ?? String(error));
    return null;
  }
}

async function expectFail(name, needle, fn) {
  try {
    await fn();
    bad(name, `Beklenen hata oluşmadı${needle ? ` (aranan: "${needle}")` : ""}`);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!needle || message.toLowerCase().includes(needle.toLowerCase())) {
      ok(name);
    } else {
      bad(name, `Hata uyuşmadı.\n  beklenen: ${needle}\n  gelen:    ${message}`);
    }
  }
}

async function expectEq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    ok(name);
  } else {
    bad(name, `beklenen: ${e}\ngelen:    ${a}`);
  }
}

async function scalar(db, sql) {
  const { rows } = await db.query(sql);
  return Object.values(rows[0])[0];
}

/** authenticated rolüyle çalışıp ardından rolü geri alır. */
async function asUser(db, uid, fn) {
  await db.exec(`set test.uid = '${uid}'; set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

const STUB_SCHEMAS = `
-- ── Supabase rol şablonları ────────────────────────────────────────────────
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase, tablo oluşturulduğunda anon/authenticated/service_role'e ALL verir.
-- 0002_rls.sql'in bu varsayılan yetkileri düzgün şekilde kısıtladığını test eder.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ── auth şeması (Supabase Auth yerine geçici) ──────────────────────────────
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Gerçek Supabase'te JWT'den okunur; testte test.uid GUC'undan okunur.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

-- ── storage şeması (Supabase Storage yerine geçici) ────────────────────────
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id) on delete cascade,
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1 : greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)];
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
`;

const MIGRATION_FILES = [
  "0001_schema.sql",
  "0002_rls.sql",
  "0003_functions.sql",
  "0004_premium.sql",
  "0005_storage.sql",
];

async function main() {
  console.log("\nTürkTube · Veritabanı doğrulama testleri\n");

  const db = new PGlite();

  // ── pgcrypto desteklenmiyorsa yerel digest taklidi kur ────────────────────
  let pgcryptoAvailable = true;
  try {
    await db.exec("create extension if not exists pgcrypto;");
  } catch {
    pgcryptoAvailable = false;
  }

  await db.exec(STUB_SCHEMAS);

  // ── Migrasyonları sırayla çalıştır ────────────────────────────────────────
  console.log("1) Migrasyonlar");
  for (const file of MIGRATION_FILES) {
    let sql = readFileSync(join(MIGRATIONS, file), "utf8");
    if (!pgcryptoAvailable) {
      // Not: Supabase her zaman pgcrypto içerir. Bu yalnızca yerel test taklididir.
      // Fonksiyon olarak döndürülür; aksi halde JS `replace` $$ kaçışını bozar.
      const stub =
        "create or replace function public.digest(data text, algo text) returns text language sql immutable as $$ select md5(data) $$;";
      sql = sql.replace(/create extension if not exists pgcrypto;/i, () => stub);
    }
    await expectOk(`${file} hatasız uygulandı`, () => db.exec(sql));
  }

  if (!pgcryptoAvailable) {
    console.log("        (pgcrypto yerel olarak yoktu; digest için md5 taklidi kullanıldı)");
  }

  // ── Kurulum: kullanıcılar ─────────────────────────────────────────────────
  console.log("\n2) Kullanıcı ve kanal");
  await expectOk("yeni kullanıcı için profil otomatik oluştu", async () => {
    await db.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values
        ('${U_OWNER}',   'sahip@turktube.com',     '{"display_name":"Bilal Efendi"}'),
        ('${U_VIEWER}',  'izleyici@turktube.com',  '{"display_name":"Izleyici"}'),
        ('${U_STRANGER}','yabanci@turktube.com',   '{"display_name":"Yabanci"}');
    `);
    const ad = await scalar(
      db,
      `select display_name from public.profiles where id = '${U_OWNER}'`,
    );
    if (ad !== "Bilal Efendi") throw new Error(`display_name = ${ad}`);
  });

  await expectOk("kanal oluşturma (authenticated, RLS uyumlu)", () =>
    asUser(db, U_OWNER, () =>
      db.query(
        `insert into public.channels (owner_id, name, handle, description)
         values ($1, $2, $3, $4)`,
        [U_OWNER, "Bilal Efendi", "bilal_efendi", "TürkTube test kanalı"],
      ),
    ),
  );

  let channelId = "";
  try {
    channelId = String(await scalar(db, `select id from public.channels limit 1`));
  } catch (error) {
    console.log(`        (kanal okunamadı: ${error?.message})`);
  }

  if (!channelId || channelId === "undefined") {
    console.log("\nKanal oluşmadığı için kalan testler çalıştırılamadı.");
    console.log(`Sonuç: ${passCount} başarılı · ${failCount} başarısız`);
    process.exitCode = 1;
    await db.close();
    return;
  }

  await expectFail("aynı kanal adresi (handle) tekrar kullanılamaz", "duplicate key", () =>
    asUser(db, U_STRANGER, () =>
      db.query(
        `insert into public.channels (owner_id, name, handle) values ($1, 'Sahte', 'bilal_efendi')`,
        [U_STRANGER],
      ),
    ),
  );

  await expectFail(
    "subscriber_count istemciden değiştirilemez (kolon yetkisi)",
    "permission denied",
    () =>
      asUser(db, U_OWNER, () =>
        db.query(`update public.channels set subscriber_count = 99999 where id = $1`, [channelId]),
      ),
  );

  // ── Puan / Premium alanlarının istemciye kapalı olması ────────────────────
  console.log("\n3) Puan ve Premium alanlarının koruması");
  await expectFail("profiles.points istemciden değiştirilemez", "permission denied", () =>
    asUser(db, U_OWNER, () =>
      db.query(`update public.profiles set points = 999999 where id = $1`, [U_OWNER]),
    ),
  );

  await expectFail(
    "profiles.premium_until istemciden değiştirilemez",
    "permission denied",
    () =>
      asUser(db, U_OWNER, () =>
        db.query(`update public.profiles set premium_until = now() + interval '1 year' where id = $1`, [
          U_OWNER,
        ]),
      ),
  );

  await expectFail(
    "point_transactions tablosuna istemci INSERT atamaz",
    "permission denied",
    () =>
      asUser(db, U_OWNER, () =>
        db.query(
          `insert into public.point_transactions (user_id, amount, balance_after, kind, description)
           values ($1, 1000, 1000, 'admin_adjust', 'hile')`,
          [U_OWNER],
        ),
      ),
  );

  await expectFail(
    "premium_purchases tablosuna istemci INSERT atamaz",
    "permission denied",
    () =>
      asUser(db, U_OWNER, () =>
        db.query(
          `insert into public.premium_purchases (user_id, points_spent, days, starts_at, ends_at)
           values ($1, 1, 3650, now(), now() + interval '10 years')`,
          [U_OWNER],
        ),
      ),
  );

  await expectFail(
    "video_views tablosu istemciye tamamen kapalı (SELECT)",
    "permission denied",
    () => asUser(db, U_VIEWER, () => db.query(`select * from public.video_views limit 1`)),
  );

  await expectFail(
    "videos.view_count istemciden değiştirilemez",
    "permission denied",
    () => asUser(db, U_OWNER, () => db.query(`update public.videos set view_count = 1`)),
  );

  await expectFail(
    "anon kullanıcı purchase_premium çağıramaz",
    "permission denied",
    async () => {
      await db.exec("reset role; set test.uid = ''; set role anon;");
      try {
        await db.query(`select public.purchase_premium()`);
      } finally {
        await db.exec("reset role;");
      }
    },
  );

  // ── Video oluştur ─────────────────────────────────────────────────────────
  console.log("\n4) Video sistemi");
  await expectOk("kanal sahibi kendi kanalına video yükleyebilir", async () => {
    await asUser(db, U_OWNER, () =>
      db.query(
        `insert into public.videos (channel_id, title, video_url, description, visibility)
         values ($1, 'İlk Video', 'https://cdn.turktube.test/v1.mp4', 'Açıklama', 'public')`,
        [channelId],
      ),
    );
  });

  const videoA = String(await scalar(db, `select id from public.videos limit 1`));

  await expectFail(
    "başkasının kanalına video eklenemez (RLS WITH CHECK)",
    "row-level security",
    () =>
      asUser(db, U_STRANGER, () =>
        db.query(
          `insert into public.videos (channel_id, title, video_url) values ($1, 'Hile', 'x')`,
          [channelId],
        ),
      ),
  );

  await expectOk("ikinci ve üçüncü video (test amaçlı)", async () => {
    await db.query(
      `insert into public.videos (channel_id, title, video_url, visibility)
       values ($1, 'Dolgu Video', 'https://cdn.turktube.test/v2.mp4', 'public'),
              ($1, 'Limit Video', 'https://cdn.turktube.test/v3.mp4', 'public')`,
      [channelId],
    );
  });

  const videos = (await db.query(`select id, title from public.videos order by created_at`)).rows;
  const videoB = String(videos.find((v) => v.title === "Dolgu Video").id);
  const videoC = String(videos.find((v) => v.title === "Limit Video").id);

  await expectOk("private video yalnızca sahibi tarafından görünür", async () => {
    await db.query(
      `update public.videos set visibility = 'private' where id = '${videoB}'`,
    );
    const sahibiGoruntu = await asUser(db, U_OWNER, async () => {
      const { rows } = await db.query(`select id from public.videos where id = '${videoB}'`);
      return rows.length;
    });
    const yabanciGoruntu = await asUser(db, U_STRANGER, async () => {
      const { rows } = await db.query(`select id from public.videos where id = '${videoB}'`);
      return rows.length;
    });
    if (sahibiGoruntu !== 1) throw new Error(`sahibi=${sahibiGoruntu}`);
    if (yabanciGoruntu !== 0) throw new Error(`yabancı=${yabanciGoruntu}`);
    await db.query(`update public.videos set visibility = 'public' where id = '${videoB}'`);
  });

  // ── İzlenme sayacı + puan sistemi ────────────────────────────────────────
  console.log("\n5) İzlenme ve TürkTube Puanı");

  await expectOk("yeni kullanıcılar için profil oluştu (puan testi)", async () => {
    await db.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values
        ('55555555-5555-5555-5555-555555555555', 'ek@turktube.com', '{"display_name":"Ek Izleyici"}'),
        ('66666666-6666-6666-6666-666666666666', 'ek2@turktube.com', '{"display_name":"Ikinci Izleyici"}');
    `);
  });
  const U_EXTRA = "55555555-5555-5555-5555-555555555555";
  const U_EXTRA2 = "66666666-6666-6666-6666-666666666666";

  async function registerView(uid, vid, seconds) {
    return asUser(db, uid, async () => {
      const { rows } = await db.query(`select public.register_view($1::uuid, $2::int) as r`, [
        vid,
        seconds,
      ]);
      return rows[0].r;
    });
  }

  await expectOk("5 saniyenin altındaki izlenme sayılmaz", async () => {
    const r = await registerView(U_VIEWER, videoA, 3);
    if (r.sayildi !== false) throw new Error(`sayildi=${r.sayildi}`);
    if (r.sebep !== "izleme_suresi_yetersiz") throw new Error(`sebep=${r.sebep}`);
  });

  await expectOk("geçerli izlenme view_count'ı 1 artırır", async () => {
    const r = await registerView(U_VIEWER, videoA, 30);
    if (r.sayildi !== true) throw new Error(`sayildi=${r.sayildi}`);
    const n = Number(await scalar(db, `select view_count from public.videos where id = '${videoA}'`));
    if (n !== 1) throw new Error(`view_count=${n}`);
  });

  await expectOk("aynı izleyicinin 6 saat içindeki tekrar izlemesi sayılmaz", async () => {
    const r = await registerView(U_VIEWER, videoA, 60);
    if (r.sayildi !== false) throw new Error(`sayildi=${r.sayildi}`);
    if (r.sebep !== "tekrar_izleme") throw new Error(`sebep=${r.sebep}`);
    const n = Number(await scalar(db, `select view_count from public.videos where id = '${videoA}'`));
    if (n !== 1) throw new Error(`view_count=${n}`);
  });

  await expectOk("kanal sahibi kendi videosunu izlerse sayılmaz", async () => {
    const r = await registerView(U_OWNER, videoA, 60);
    if (r.sayildi !== false) throw new Error(`sayildi=${r.sayildi}`);
    if (r.sebep !== "kendi_videosu") throw new Error(`sebep=${r.sebep}`);
  });

  await expectOk("24 saatte en fazla 25 geçerli izlenme (spam limiti)", async () => {
    const ilk = await registerView(U_STRANGER, videoA, 30);
    if (ilk.sayildi !== true) throw new Error(`ilk=${JSON.stringify(ilk)}`);

    const hash = String(
      await scalar(
        db,
        `select viewer_hash from public.video_views where user_id = '${U_STRANGER}' limit 1`,
      ),
    );

    // Aynı izleyiciye ait 24 geçerli kayıt daha (günlük sayacı doldurur)
    await db.query(
      `insert into public.video_views (video_id, user_id, viewer_hash, watch_seconds, is_counted, counted_at)
       select id, '${U_STRANGER}', $1, 30, true, now() from public.videos where id = $2`,
      [hash, videoB],
    );

    const t = await registerView(U_STRANGER, videoC, 30);
    if (t.sayildi !== false) throw new Error(`sayildi=${t.sayildi}`);
    if (t.sebep !== "gunluk_limit") throw new Error(`sebep=${t.sebep}`);

    const n = Number(await scalar(db, `select view_count from public.videos where id = '${videoC}'`));
    if (n !== 0) throw new Error(`view_count(videoC)=${n}`);
  });

  // ── Puan ödülü: 999.999 → 1.000.000 izlenme ──────────────────────────────
  console.log("\n6) Puan eşiği");

  await expectOk("1.000.000 izlenme tamamlandığında +100 puan verilir", async () => {
    // 0'dan 10 bloğa sıçrama: (10 - 0) * 10 = 100 puan
    await db.query(
      `update public.videos set view_count = 999999, awarded_blocks = 0 where id = '${videoA}'`,
    );

    const r = await registerView(U_EXTRA, videoA, 30);
    if (r.sayildi !== true) throw new Error(`sayildi=${JSON.stringify(r)}`);
    if (Number(r.puan) !== 100) throw new Error(`puan=${r.puan}`);

    const viewCount = Number(
      await scalar(db, `select view_count from public.videos where id = '${videoA}'`),
    );
    const blocks = Number(
      await scalar(db, `select awarded_blocks from public.videos where id = '${videoA}'`),
    );
    const points = Number(
      await scalar(db, `select points from public.profiles where id = '${U_OWNER}'`),
    );

    if (viewCount !== 1000000) throw new Error(`view_count=${viewCount}`);
    if (blocks !== 10) throw new Error(`awarded_blocks=${blocks}`);
    if (points !== 100) throw new Error(`owner points=${points}`);
  });

  await expectOk("ödül yalnızca blok geçişinde verilir (tekrar puan yok)", async () => {
    const r = await registerView(U_EXTRA2, videoA, 30);
    if (r.sayildi !== true) throw new Error(`sayildi=${JSON.stringify(r)}`);
    if (Number(r.puan) !== 0) throw new Error(`puan=${r.puan}`);
    const points = Number(
      await scalar(db, `select points from public.profiles where id = '${U_OWNER}'`),
    );
    if (points !== 100) throw new Error(`owner points=${points}`);
  });

  await expectOk("puan defteri (point_transactions) kaydı oluştu", async () => {
    const { rows } = await db.query(
      `select amount, balance_after, kind from public.point_transactions
        where user_id = '${U_OWNER}' order by id desc limit 1`,
    );
    if (rows.length !== 1) throw new Error(`kayıt=${rows.length}`);
    if (Number(rows[0].amount) !== 100) throw new Error(`amount=${rows[0].amount}`);
    if (Number(rows[0].balance_after) !== 100) throw new Error(`balance=${rows[0].balance_after}`);
    if (rows[0].kind !== "view_milestone") throw new Error(`kind=${rows[0].kind}`);
  });

  await expectOk("puan kazanma bildirimi oluştu", async () => {
    const n = Number(
      await scalar(
        db,
        `select count(*) from public.notifications where user_id = '${U_OWNER}' and type = 'puan'`,
      ),
    );
    if (n < 1) throw new Error(`bildirim=${n}`);
  });

  await expectOk("izleme geçmişi otomatik doldu", async () => {
    const n = Number(
      await scalar(
        db,
        `select count(*) from public.watch_history where user_id = '${U_VIEWER}'`,
      ),
    );
    if (n < 1) throw new Error(`geçmiş=${n}`);
  });

  // ── Beğeni / yorum / abonelik ─────────────────────────────────────────────
  console.log("\n7) Beğeni, yorum ve abonelik");

  async function rpcAsUser(uid, fn) {
    return asUser(db, uid, fn);
  }

  await expectOk("beğeni ekleme / kaldırma (toggle) doğru çalışır", async () => {
    const birinci = await rpcAsUser(U_VIEWER, async () => {
      const { rows } = await db.query(`select public.set_video_reaction($1::uuid, 1::smallint) r`, [
        videoA,
      ]);
      return rows[0].r;
    });
    if (birinci.tepki !== 1) throw new Error(`tepki=${birinci.tepki}`);
    if (Number(birinci.begeni) !== 1) throw new Error(`begeni=${birinci.begeni}`);

    const ikinci = await rpcAsUser(U_VIEWER, async () => {
      const { rows } = await db.query(`select public.set_video_reaction($1::uuid, 1::smallint) r`, [
        videoA,
      ]);
      return rows[0].r;
    });
    if (ikinci.tepki !== 0) throw new Error(`tepki=${ikinci.tepki}`);
    if (Number(ikinci.begeni) !== 0) throw new Error(`begeni=${ikinci.begeni}`);

    const ucuncu = await rpcAsUser(U_VIEWER, async () => {
      const { rows } = await db.query(`select public.set_video_reaction($1::uuid, -1::smallint) r`, [
        videoA,
      ]);
      return rows[0].r;
    });
    if (ucuncu.tepki !== -1) throw new Error(`tepki=${ucuncu.tepki}`);
    if (Number(ucuncu.begenmeme) !== 1) throw new Error(`begenmeme=${ucuncu.begenmeme}`);
  });

  await expectFail("giriş yapmadan beğeni atılamaz", "Giriş", async () => {
    await db.exec(`set test.uid = ''; set role authenticated;`);
    try {
      await db.query(`select public.set_video_reaction($1::uuid, 1::smallint)`, [videoA]);
    } finally {
      await db.exec("reset role;");
    }
  });

  await expectOk("yorum ekleme comment_count'ı artırır ve sahibine bildirim gönderir", async () => {
    await asUser(db, U_VIEWER, () =>
      db.query(
        `insert into public.comments (video_id, author_id, content) values ($1, $2, 'Harika bir video!')`,
        [videoA, U_VIEWER],
      ),
    );
    const count = Number(
      await scalar(db, `select comment_count from public.videos where id = '${videoA}'`),
    );
    if (count !== 1) throw new Error(`comment_count=${count}`);

    const bildirim = Number(
      await scalar(
        db,
        `select count(*) from public.notifications where user_id = '${U_OWNER}' and type = 'yeni_yorum'`,
      ),
    );
    if (bildirim !== 1) throw new Error(`bildirim=${bildirim}`);
  });

  await expectOk("yorum beğenisi ekleme / kaldırma (toggle) doğru çalışır", async () => {
    const yorumId = String(await scalar(db, `select id from public.comments limit 1`));
    const acik = await asUser(db, U_VIEWER, async () => {
      const { rows } = await db.query(`select public.toggle_comment_like($1::uuid) r`, [yorumId]);
      return rows[0].r;
    });
    if (acik.begenildi !== true) throw new Error(`begenildi=${acik.begenildi}`);
    if (Number(acik.begeni) !== 1) throw new Error(`begeni=${acik.begeni}`);

    const kapali = await asUser(db, U_VIEWER, async () => {
      const { rows } = await db.query(`select public.toggle_comment_like($1::uuid) r`, [yorumId]);
      return rows[0].r;
    });
    if (kapali.begenildi !== false) throw new Error(`begenildi=${kapali.begenildi}`);
    if (Number(kapali.begeni) !== 0) throw new Error(`begeni=${kapali.begeni}`);
  });

  await expectOk("abone olma / çıkma (toggle) abone sayısını günceller", async () => {
    const acik = await asUser(db, U_VIEWER, async () => {
      const { rows } = await db.query(`select public.toggle_subscription($1::uuid) r`, [channelId]);
      return rows[0].r;
    });
    if (acik.abone !== true) throw new Error(`abone=${acik.abone}`);
    if (Number(acik.abone_sayisi) !== 1) throw new Error(`abone_sayisi=${acik.abone_sayisi}`);

    const kapali = await asUser(db, U_VIEWER, async () => {
      const { rows } = await db.query(`select public.toggle_subscription($1::uuid) r`, [channelId]);
      return rows[0].r;
    });
    if (kapali.abone !== false) throw new Error(`abone=${kapali.abone}`);
    if (Number(kapali.abone_sayisi) !== 0) throw new Error(`abone_sayisi=${kapali.abone_sayisi}`);
  });

  await expectOk("abone olma sahibine bildirim gönderir", async () => {
    const n = Number(
      await scalar(
        db,
        `select count(*) from public.notifications where user_id = '${U_OWNER}' and type = 'yeni_abone'`,
      ),
    );
    if (n < 1) throw new Error(`bildirim=${n}`);
  });

  await expectFail("kendi kanalına abone olunamaz", "Kendi kanal", async () => {
    await asUser(db, U_OWNER, () =>
      db.query(`select public.toggle_subscription($1::uuid)`, [channelId]),
    );
  });

  // ── Premium ───────────────────────────────────────────────────────────────
  console.log("\n8) TürkTube Premium");

  await expectOk("100 puanla Premium satın alınabilir", async () => {
    const r = await asUser(db, U_OWNER, async () => {
      const { rows } = await db.query(`select public.purchase_premium() r`);
      return rows[0].r;
    });

    if (r.basarili !== true) throw new Error(`sonuç=${JSON.stringify(r)}`);
    if (Number(r.harcanan) !== 100) throw new Error(`harcanan=${r.harcanan}`);
    if (Number(r.kalan_puan) !== 0) throw new Error(`kalan=${r.kalan_puan}`);
    if (new Date(r.bitis).getTime() <= Date.now()) throw new Error(`bitis=${r.bitis}`);

    const kalan = Number(
      await scalar(db, `select points from public.profiles where id = '${U_OWNER}'`),
    );
    if (kalan !== 0) throw new Error(`kalan puan=${kalan}`);

    const alim = Number(
      await scalar(db, `select count(*) from public.premium_purchases where user_id = '${U_OWNER}'`),
    );
    if (alim !== 1) throw new Error(`satın alım=${alim}`);

    const tx = await db.query(
      `select amount from public.point_transactions where user_id = '${U_OWNER}' order by id desc limit 1`,
    );
    if (Number(tx.rows[0].amount) !== -100) throw new Error(`tx=${tx.rows[0].amount}`);
  });

  await expectOk("is_premium() satın alımdan sonra true döner", async () => {
    const aktif = await scalar(db, `select public.is_premium('${U_OWNER}'::uuid)`);
    if (aktif !== true) throw new Error(`aktif=${aktif}`);
  });

  await expectFail("puan kalmayınca ikinci kez Premium alınamaz", "Yetersiz", async () => {
    await asUser(db, U_OWNER, () => db.query(`select public.purchase_premium()`));
  });

  await expectOk("Premium kanal analizi son 30 günü döndürür", async () => {
    const rows = await asUser(db, U_OWNER, async () => {
      const { rows } = await db.query(`select * from public.get_channel_analytics($1::uuid, 30)`, [
        channelId,
      ]);
      return rows;
    });
    if (rows.length !== 30) throw new Error(`satır=${rows.length}`);
  });

  await expectFail(
    "Premium olmayan kullanıcı analiz alamaz",
    "Premium",
    async () => {
      await asUser(db, U_STRANGER, () =>
        db.query(`select * from public.get_channel_analytics($1::uuid, 30)`, [channelId]),
      );
    },
  );

  await expectFail(
    "Premium olsa bile başkasının kanalının analizi alınamaz",
    "erişemezsiniz",
    async () => {
      await db.query(
        `update public.profiles set premium_until = now() + interval '30 days' where id = '${U_STRANGER}'`,
      );
      await asUser(db, U_STRANGER, () =>
        db.query(`select * from public.get_channel_analytics($1::uuid, 30)`, [channelId]),
      );
    },
  );

  await expectFail("Premium süresi dolunca özellik otomatik kapanır", "Premium", async () => {
    await db.query(
      `update public.profiles set premium_until = now() - interval '1 hour' where id = '${U_OWNER}'`,
    );
    const aktif = await scalar(db, `select public.is_premium('${U_OWNER}'::uuid)`);
    if (aktif !== false) throw new Error(`aktif=${aktif}`);
    await asUser(db, U_OWNER, () =>
      db.query(`select * from public.get_channel_analytics($1::uuid, 30)`, [channelId]),
    );
  });

  // ── Storage politikaları ──────────────────────────────────────────────────
  console.log("\n9) Storage");

  await expectOk("dört storage kovası da oluşturuldu", async () => {
    const n = Number(
      await scalar(
        db,
        `select count(*) from storage.buckets where id in ('videos','thumbnails','avatars','banners')`,
      ),
    );
    if (n !== 4) throw new Error(`kova=${n}`);
  });

  await expectOk("kullanıcı kendi klasörüne dosya yükleyebilir", async () => {
    await asUser(db, U_OWNER, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('videos', $1)`, [
        `${U_OWNER}/video.mp4`,
      ]),
    );
  });

  await expectFail(
    "başkasının klasörüne dosya yüklenemez",
    "row-level security",
    () =>
      asUser(db, U_STRANGER, () =>
        db.query(`insert into storage.objects (bucket_id, name) values ('videos', $1)`, [
          `${U_OWNER}/serseri.mp4`,
        ]),
      ),
  );

  // ── Veri izolasyonu ───────────────────────────────────────────────────────
  console.log("\n10) Veri izolasyonu");

  await expectOk("başkasının bildirimleri okunamaz", async () => {
    const n = await asUser(db, U_STRANGER, async () =>
      scalar(db, `select count(*) from public.notifications where user_id = '${U_OWNER}'`),
    );
    if (Number(n) !== 0) throw new Error(`görünen=${n}`);
  });

  await expectOk("kendi puan geçmişi okunabilir", async () => {
    const n = await asUser(db, U_OWNER, async () =>
      scalar(db, `select count(*) from public.point_transactions where user_id = '${U_OWNER}'`),
    );
    if (Number(n) < 1) throw new Error(`kayıt=${n}`);
  });

  await expectOk("başkasının puan geçmişi okunamaz", async () => {
    const n = await asUser(db, U_STRANGER, async () =>
      scalar(db, `select count(*) from public.point_transactions where user_id = '${U_OWNER}'`),
    );
    if (Number(n) !== 0) throw new Error(`görünen=${n}`);
  });

  // ── Özet ──────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(64)}`);
  console.log(`Toplam ${passCount + failCount} test · ${passCount} başarılı · ${failCount} başarısız`);
  console.log("─".repeat(64));

  if (failCount > 0) {
    process.exitCode = 1;
  }

  await db.close();
}

main().catch((error) => {
  console.error("\nTEST ÇALIŞTIRICISI HATA VERDİ:\n", error);
  process.exitCode = 1;
});







