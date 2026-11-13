import type { MetadataRoute } from "next";
import { APP_ICON } from "../../assets/files";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIVEXA — AI Services Catalog",
    short_name: "AIVEXA",
    description: "Международный каталог AI-сервисов: подбор, сравнение и быстрый доступ к лучшим AI-инструментам.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b16",
    theme_color: "#0b0b16",
    icons: [
      { src: APP_ICON, sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: APP_ICON, sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: APP_ICON, sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
