"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/supabase/env";
import { isValidEmail, slugifyHandle } from "@/lib/format";

/** Form action'larının ortak dönüş tipi. */
export interface ActionState {
  error?: string;
  success?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/* ─────────────────────────────  KİMLİK DOĞRULAMA  ───────────────────────── */

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  if (!isValidEmail(email)) return { error: "Geçerli bir e-posta adresi girin." };
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalıdır." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "E-posta veya şifre hatalı."
          : "Giriş yapılamadı: " + error.message,
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = readString(formData, "display_name");
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  if (displayName.length < 2) return { error: "Görünen ad en az 2 karakter olmalıdır." };
  if (!isValidEmail(email)) return { error: "Geçerli bir e-posta adresi girin." };
  if (password.length < 6) return { error: "Şifre en az 6 karakter olmalıdır." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: "Kayıt oluşturulamadı: " + error.message };

  // E-posta doğrulaması açıksa oturum hemen açılmaz.
  if (!data.session) {
    return {
      success:
        "Hesabın oluşturuldu! E-posta adresine gönderilen bağlantıyla hesabını doğrulayabilirsin.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ──────────────────────────────  PROFİL  ────────────────────────────────── */

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş yapmalısınız." };

  const displayName = readString(formData, "display_name");
  const bio = readString(formData, "bio");
  const avatarUrl = readString(formData, "avatar_url");

  if (displayName.length < 2) return { error: "Görünen ad en az 2 karakter olmalıdır." };
  if (bio.length > 500) return { error: "Hakkında yazısı en fazla 500 karakter olabilir." };

  // Yalnızca görünen alanlar güncellenir; points / premium_until
  // kolonlarına yazma yetkisi zaten verilmemiştir.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) return { error: "Profil güncellenemedi: " + error.message };

  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return { success: "Profilin güncellendi." };
}

/* ───────────────────────────────  KANAL  ────────────────────────────────── */

export async function saveChannelAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş yapmalısınız." };

  const name = readString(formData, "name");
  const handleRaw = readString(formData, "handle");
  const description = readString(formData, "description");
  const avatarUrl = readString(formData, "avatar_url");
  const bannerUrl = readString(formData, "banner_url");

  const handle = slugifyHandle(handleRaw || name);

  if (name.length < 2) return { error: "Kanal adı en az 2 karakter olmalıdır." };
  if (!/^[a-z0-9_]{3,30}$/.test(handle)) {
    return { error: "Kanal adresi 3-30 karakter olmalı ve yalnızca a-z, 0-9, _ içermelidir." };
  }
  if (description.length > 1000) return { error: "Kanal açıklaması en fazla 1000 karakter olabilir." };

  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const payload = {
    name,
    handle,
    description: description || null,
    avatar_url: avatarUrl || null,
    banner_url: bannerUrl || null,
  };

  const { error } = existing
    ? await supabase.from("channels").update(payload).eq("owner_id", user.id)
    : await supabase.from("channels").insert({ ...payload, owner_id: user.id });

  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      return { error: "Bu kanal adresi zaten kullanılıyor. Başka bir adres dene." };
    }
    return { error: "Kanal kaydedilemedi: " + error.message };
  }

  revalidatePath("/profil");
  revalidatePath(`/kanal/${handle}`);
  revalidatePath("/", "layout");
  return { success: existing ? "Kanalın güncellendi." : "Kanalın oluşturuldu!" };
}

/* ────────────────────────────  VİDEO YÜKLEME  ───────────────────────────── */

export async function createVideoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Video yüklemek için giriş yapmalısınız." };

  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const videoUrl = readString(formData, "video_url");
  const thumbnailUrl = readString(formData, "thumbnail_url");
  const visibility = readString(formData, "visibility") || "public";
  const duration = Number.parseInt(readString(formData, "duration_seconds") || "0", 10);

  if (title.length < 1) return { error: "Video başlığı zorunludur." };
  if (title.length > 120) return { error: "Başlık en fazla 120 karakter olabilir." };
  if (!videoUrl) return { error: "Video dosyası yüklenemedi. Lütfen tekrar deneyin." };
  if (!["public", "unlisted", "private"].includes(visibility)) {
    return { error: "Geçersiz görünürlük ayarı." };
  }

  // Kanal sahipliği burada açıkça kontrol edilir; veritabanındaki
  // RLS politikası da aynı kuralı ikinci kez doğrular.
  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!channel) {
    return { error: "Video yüklemek için önce bir kanal oluşturmalısın." };
  }

  const { data: inserted, error } = await supabase
    .from("videos")
    .insert({
      channel_id: channel.id,
      title,
      description: description || null,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || null,
      duration_seconds: Number.isFinite(duration) && duration > 0 ? duration : 0,
      visibility,
    })
    .select("id")
    .single();

  if (error) return { error: "Video kaydedilemedi: " + error.message };

  revalidatePath("/");
  revalidatePath("/kesfet");
  redirect(`/izle/${(inserted as { id: string }).id}`);
}

export async function deleteVideoAction(formData: FormData): Promise<void> {
  const id = readString(formData, "video_id");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS yalnızca kendi kanalına ait videoların silinmesine izin verir.
  await supabase.from("videos").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath("/kesfet");
  revalidatePath("/profil");
  redirect("/profil");
}

/* ───────────────────────────────  PREMIUM  ─────────────────────────────── */

export async function purchasePremiumAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş yapmalısınız." };

  // Premium'u AÇAN tek yol bu sunucu tarafı fonksiyondur.
  // Puan bakiyesi, süre ve çift harcama kontrolü veritabanında yapılır.
  const { data, error } = await supabase.rpc("purchase_premium");

  if (error) return { error: error.message };

  const result = data as { bitis?: string; kalan_puan?: number } | null;

  revalidatePath("/premium");
  revalidatePath("/profil");
  revalidatePath("/puanlar");
  revalidatePath("/", "layout");

  return {
    success: `Premium üyeliğin aktifleştirildi! Kalan puanın: ${result?.kalan_puan ?? 0}.`,
  };
}

/* ─────────────────────────────  BİLDİRİMLER  ───────────────────────────── */

export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);

  revalidatePath("/bildirimler");
  revalidatePath("/", "layout");
}

export async function deleteNotificationAction(formData: FormData): Promise<void> {
  const id = readString(formData, "notification_id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);

  revalidatePath("/bildirimler");
  revalidatePath("/", "layout");
}

/* ───────────────────────────  OYNATMA LİSTELERİ  ────────────────────────── */

export async function createPlaylistAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Giriş yapmalısınız." };

  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const visibility = readString(formData, "visibility") || "public";

  if (title.length < 1) return { error: "Liste adı zorunludur." };
  if (title.length > 120) return { error: "Liste adı en fazla 120 karakter olabilir." };
  if (!["public", "unlisted", "private"].includes(visibility)) {
    return { error: "Geçersiz görünürlük ayarı." };
  }

  const { error } = await supabase.from("playlists").insert({
    owner_id: user.id,
    title,
    description: description || null,
    visibility,
  });

  if (error) return { error: "Liste oluşturulamadı: " + error.message };

  revalidatePath("/oynatma-listeleri");
  return { success: `"${title}" listesi oluşturuldu.` };
}

export async function deletePlaylistAction(formData: FormData): Promise<void> {
  const id = readString(formData, "playlist_id");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("playlists").delete().eq("id", id);

  revalidatePath("/oynatma-listeleri");
  redirect("/oynatma-listeleri");
}

export async function removePlaylistItemAction(formData: FormData): Promise<void> {
  const playlistId = readString(formData, "playlist_id");
  const videoId = readString(formData, "video_id");
  if (!playlistId || !videoId) return;

  const supabase = await createClient();
  await supabase.from("playlist_items").delete().eq("playlist_id", playlistId).eq("video_id", videoId);

  revalidatePath(`/oynatma-listeleri/${playlistId}`);
}

/* ───────────────────────────  İZLEME GEÇMİŞİ  ──────────────────────────── */

export async function clearWatchHistoryAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("watch_history").delete().eq("user_id", user.id);
  revalidatePath("/gecmis");
}

