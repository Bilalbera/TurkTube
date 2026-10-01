"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconSearch } from "@/components/icons";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deger, setDeger] = useState(initialValue || searchParams.get("q") || "");

  function gonder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = deger.trim();
    if (!q) return;
    router.push(`/ara?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={gonder} role="search" className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          value={deger}
          onChange={(event) => setDeger(event.target.value)}
          placeholder="Video veya kanal ara..."
          aria-label="Ara"
          className="tt-input h-10 pl-10"
        />
      </div>
      <button type="submit" className="tt-btn tt-btn-soft h-10 px-4" aria-label="Aramayı başlat">
        <IconSearch className="h-4.5 w-4.5" />
        <span className="hidden sm:inline">Ara</span>
      </button>
    </form>
  );
}
