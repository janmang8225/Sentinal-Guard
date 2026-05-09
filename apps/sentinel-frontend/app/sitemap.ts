import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sentinel-guard-three.vercel.app",
      lastModified: new Date(),
    },
    {
      url: "https://sentinel-guard-three.vercel.app/dashboard",
      lastModified: new Date(),
    },
    {
      url: "https://sentinel-guard-three.vercel.app/alerts",
      lastModified: new Date(),
    },
    {
      url: "https://sentinel-guard-three.vercel.app/rules",
      lastModified: new Date(),
    },
  ];
}