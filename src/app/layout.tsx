import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Sora } from "next/font/google";
import "./globals.css";

const geist = Geist({ 
  subsets: ["latin"], 
  variable: "--font-geist" 
});

const sora = Sora({ 
  subsets: ["latin"], 
  variable: "--font-sora" 
});

export const metadata: Metadata = {
  title: "Chatme",
  description: "Your second brain, in a chat.",
  
  applicationName: "Chatme",
  // manifest: "/manifest",
  
  keywords: ["note", "notes", "chat", "second brain", "reminder", "productivity", "catatan"],
  
   authors: [{ name: "Fadil" }],
  creator: "Fadil",
  
  openGraph: {
    title: "Chatme — Chat-based Note & Reminder",
    description: "Your second brain, in a chat.",
    images: [{ url: "/og-image.png" }],
  },


  
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/icon-192.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chatme",
  },
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("chatme-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const theme = stored || (prefersLight ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="id">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geist.variable} ${sora.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
