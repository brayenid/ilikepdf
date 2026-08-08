import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "kindalikepdf | Pengelolaan PDF 100% Stateless & Aman",
    template: "%s | kindalikepdf",
  },
  description:
    "Kelola, gabungkan, pisahkan, dan kompres file PDF Anda secara stateless langsung di browser. Semua pemrosesan data berjalan lokal di memori Anda tanpa pernah diunggah atau disimpan ke server mana pun.",
  keywords: [
    "pdf tools stateless",
    "pengelolaan pdf lokal",
    "gabung pdf aman",
    "kompres pdf tanpa simpan",
    "split pdf browser",
    "edit pdf privat",
    "kindalikepdf"
  ],
  openGraph: {
    title: "kindalikepdf | Pengelolaan PDF 100% Stateless & Aman",
    description: "Semua pemrosesan PDF berjalan secara lokal dan stateless di browser Anda. Dokumen diproses langsung di perangkat Anda tanpa pernah diunggah atau disimpan di server kami.",
    type: "website",
    locale: "id_ID",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-white text-[#111111]">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('PWA ServiceWorker registered scope:', reg.scope); },
                    function(err) { console.log('PWA ServiceWorker registration failed:', err); }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
