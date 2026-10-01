import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/AppShell";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TürkTube — Türkçe video platformu",
    template: "%s · TürkTube",
  },
  description:
    "TürkTube: tamamen Türkçe, modern video platformu. Video yükle, kanal oluştur, TürkTube Puanı kazan ve Premium'un ayrıcalıklarını keşfet.",
  applicationName: "TürkTube",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();

  return (
    <html lang="tr">
      <body>
        {configured ? <AppShell>{children}</AppShell> : <SetupNotice />}
      </body>
    </html>
  );
}
