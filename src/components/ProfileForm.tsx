"use client";

import { useActionState, useState } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
import { saveChannelAction, updateProfileAction, type ActionState } from "@/lib/actions";
import { slugifyHandle } from "@/lib/format";
import type { Channel, Profile } from "@/lib/types";

const baslangic: ActionState = {};

export function ProfileForm({ profil, userId }: { profil: Profile; userId: string }) {
  const [durum, formAction, bekliyor] = useActionState(updateProfileAction, baslangic);
  const [avatarUrl, setAvatarUrl] = useState(profil.avatar_url ?? "");

  return (
    <form action={formAction} className="tt-card flex flex-col gap-4 p-5">
      <h2 className="text-base font-bold">Profil bilgileri</h2>

      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <ImageUploadField
        bucket="avatars"
        userId={userId}
        label="Profil fotoğrafı"
        initialUrl={profil.avatar_url}
        maksMb={2}
        onChange={setAvatarUrl}
      />

      <div>
        <label className="tt-label" htmlFor="display_name">
          Görünen ad
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profil.display_name}
          minLength={2}
          maxLength={60}
          required
          className="tt-input"
        />
      </div>

      <div>
        <label className="tt-label" htmlFor="bio">
          Hakkında
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profil.bio ?? ""}
          rows={4}
          maxLength={500}
          placeholder="Kendinden kısaca bahset..."
          className="tt-input resize-y"
        />
      </div>

      {durum.error ? <p className="text-sm text-accent">{durum.error}</p> : null}
      {durum.success ? <p className="text-sm text-brand-strong">{durum.success}</p> : null}

      <button type="submit" disabled={bekliyor} className="tt-btn tt-btn-primary h-10 self-start px-5">
        {bekliyor ? "Kaydediliyor..." : "Profili kaydet"}
      </button>
    </form>
  );
}

export function ChannelForm({
  kanal,
  userId,
}: {
  kanal: Channel | null;
  userId: string;
}) {
  const [durum, formAction, bekliyor] = useActionState(saveChannelAction, baslangic);
  const [avatarUrl, setAvatarUrl] = useState(kanal?.avatar_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(kanal?.banner_url ?? "");
  const [handle, setHandle] = useState(kanal?.handle ?? "");

  return (
    <form action={formAction} className="tt-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold">{kanal ? "Kanal bilgileri" : "Kanal oluştur"}</h2>
        <p className="text-xs text-muted">
          Video yüklemek ve abone kazanmak için bir kanala ihtiyacın var. Her hesabın bir kanalı olur.
        </p>
      </div>

      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <input type="hidden" name="banner_url" value={bannerUrl} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ImageUploadField
          bucket="avatars"
          userId={userId}
          label="Kanal avatarı"
          initialUrl={kanal?.avatar_url}
          maksMb={2}
          onChange={setAvatarUrl}
        />
        <ImageUploadField
          bucket="banners"
          userId={userId}
          label="Kanal kapağı (banner)"
          initialUrl={kanal?.banner_url}
          maksMb={5}
          onChange={setBannerUrl}
          yukseklikSinifi="h-28 w-full max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="tt-label" htmlFor="name">
            Kanal adı
          </label>
          <input
            id="name"
            name="name"
            defaultValue={kanal?.name ?? ""}
            minLength={2}
            maxLength={60}
            required
            onChange={(event) => {
              if (!kanal && !handle) setHandle(slugifyHandle(event.target.value));
            }}
            className="tt-input"
            placeholder="Örn: Bilal Efendi"
          />
        </div>

        <div>
          <label className="tt-label" htmlFor="handle">
            Kanal adresi (handle)
          </label>
          <input
            id="handle"
            name="handle"
            value={handle}
            onChange={(event) => setHandle(slugifyHandle(event.target.value))}
            minLength={3}
            maxLength={30}
            required
            className="tt-input"
            placeholder="bilal_efendi"
          />
          <p className="mt-1 text-xs text-muted">
            turktube.com/kanal/<span className="font-semibold">{handle || "kanal_adresin"}</span>
          </p>
        </div>
      </div>

      <div>
        <label className="tt-label" htmlFor="description">
          Kanal açıklaması
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={kanal?.description ?? ""}
          rows={4}
          maxLength={1000}
          placeholder="Kanalında ne tür videolar paylaşacaksın?"
          className="tt-input resize-y"
        />
      </div>

      {durum.error ? <p className="text-sm text-accent">{durum.error}</p> : null}
      {durum.success ? <p className="text-sm text-brand-strong">{durum.success}</p> : null}

      <button type="submit" disabled={bekliyor} className="tt-btn tt-btn-primary h-10 self-start px-5">
        {bekliyor ? "Kaydediliyor..." : kanal ? "Kanalı kaydet" : "Kanalı oluştur"}
      </button>
    </form>
  );
}
