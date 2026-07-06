import withSerwistInit from "@serwist/next"
import type { NextConfig } from "next"

const revision = crypto.randomUUID()

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
}

export default withSerwist(nextConfig)
