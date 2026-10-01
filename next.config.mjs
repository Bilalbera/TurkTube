import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TürkTube, video/thumbnail adreslerini Supabase Storage üzerinden servis eder.
  // Ham <img> etiketi kullandığımız için uzak kaynak kısıtı gerekmiyor.
  turbopack: {
    // Üst klasörlerdeki lockfile'ların yanlışlıkla kök sayılmasını engeller.
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Video yükleme işlemleri Storage'a gider, form gövdeleri küçük kalır.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

