import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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
    default: "kindalikepdf | Pengolahan PDF Lokal di Browser",
    template: "%s | kindalikepdf",
  },
  description:
    "Kelola, gabungkan, pisahkan, dan kompres file PDF Anda secara lokal langsung di browser. Semua pemrosesan data berjalan di memori Anda tanpa diunggah ke server.",
  keywords: [
    "pdf tools lokal",
    "pengelolaan pdf browser",
    "gabung pdf",
    "kompres pdf lokal",
    "split pdf",
    "edit pdf",
    "kindalikepdf"
  ],
  openGraph: {
    title: "kindalikepdf | Pengolahan PDF Lokal di Browser",
    description: "Semua pemrosesan PDF berjalan secara lokal di browser Anda. Dokumen diproses langsung di perangkat Anda tanpa pernah diunggah atau disimpan di server kami.",
    type: "website",
    locale: "id_ID",
    images: [
      {
        url: "/kindalike.png",
        width: 512,
        height: 512,
        alt: "Logo kindalikepdf",
      },
    ],
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
        <PWAInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('[PWA] ServiceWorker registered, scope:', reg.scope);
                      // Detect SW update and reload to activate new version
                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'activated') {
                            console.log('[PWA] New SW activated — cache refreshed.');
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.warn('[PWA] ServiceWorker registration failed:', err);
                    });
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
