import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/privacy"],
      disallow: ["/", "/profile/", "/room/"],
    },
    sitemap: "https://chatme-jet.vercel.app/sitemap.xml",
  }
}
