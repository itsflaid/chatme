import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Sora } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" })

export const metadata: Metadata = {
  title: "Chatme",
  description: "Your second brain, in a chat.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${geist.variable} ${sora.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}