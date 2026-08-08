"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FilePlus,
  Scissors,
  ArrowsDownUp,
  SquaresFour,
  Lock,
  Lightning,
  DeviceMobile,
} from "@phosphor-icons/react";
import Navbar from "@/components/Navbar";
import { ToolCard, HeroCTA } from "@/components/LandingClient";

const tools = [
  {
    href: "/tools/compress",
    label: "Kompres PDF",
    description: "Kurangi ukuran file PDF tanpa banyak mengorbankan kualitas.",
    icon: ArrowsDownUp,
  },
  {
    href: "/tools/merge",
    label: "Gabungkan PDF",
    description: "Satukan beberapa file PDF menjadi satu dokumen.",
    icon: FilePlus,
  },
  {
    href: "/tools/split",
    label: "Pisahkan PDF",
    description: "Pisahkan halaman tertentu menjadi file terpisah.",
    icon: Scissors,
  },
  {
    href: "/tools/organize",
    label: "Kelola Halaman",
    description: "Susun ulang, hapus, atau selipkan halaman dalam PDF.",
    icon: SquaresFour,
  },
];

const steps = [
  {
    number: "01",
    title: "Upload file",
    description:
      "Seret file ke area upload atau klik untuk memilih dari perangkat Anda.",
  },
  {
    number: "02",
    title: "Proses sesuai kebutuhan",
    description:
      "Atur halaman, kompres, pisahkan, atau gabungkan file PDF Anda dalam sekejap.",
  },
  {
    number: "03",
    title: "Unduh hasilnya",
    description:
      "File langsung tersedia untuk diunduh. Tidak perlu akun, tidak ada daftar tunggu.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar transparent />
      <main>
        {/* ── HERO ── */}
        <section
          className="min-h-[calc(100dvh-64px)] flex flex-col justify-center w-full py-16 overflow-hidden relative z-10"
          aria-labelledby="hero-heading"
        >
          {/* Decorative Glowing Blobs (Semi-Animated Background via CSS Keyframes) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            {/* Blob 1 (Teal Accent) */}
            <div
              className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(13,148,136,0.22) 0%, rgba(13,148,136,0) 70%)",
                filter: "blur(90px)",
                animation: "float-blob-1 22s infinite ease-in-out",
              }}
            />
            
            {/* Blob 2 (Soft Blue Accent) */}
            <div
              className="absolute bottom-[5%] right-[-15%] w-[55vw] h-[55vw] max-w-[550px] max-h-[550px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 70%)",
                filter: "blur(80px)",
                animation: "float-blob-2 26s infinite ease-in-out",
              }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left: copy */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-5"
                style={{ color: "var(--accent)" }}
              >
                PDF Tools Gratis
              </p>
              <h1
                id="hero-heading"
                className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-5"
                style={{ color: "var(--foreground)" }}
              >
                Kelola PDF anda!
              </h1>
              <p
                className="text-base max-w-md mb-8 leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                Alat bantu pengolahan dokumen PDF sederhana yang berjalan secara lokal.
                Proses penggabungan, pemisahan, dan kompresi diselesaikan langsung di dalam browser Anda.
              </p>
              <HeroCTA />
            </div>

            {/* Right: hero image */}
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <Image
                src="/hero.jpg"
                alt="Ilustrasi tools manajemen PDF"
                width={640}
                height={360}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* ── TOOL GRID ── */}
        <section
          id="tools"
          className="py-20 border-t"
          style={{ borderColor: "var(--border-solid)" }}
          aria-labelledby="tools-heading"
        >
          <div className="max-w-6xl mx-auto px-6">
            <h2
              id="tools-heading"
              className="text-2xl font-semibold tracking-tight mb-2"
            >
              Pilih tool yang Anda butuhkan
            </h2>
            <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>
              Semua proses berjalan di browser, tidak ada file yang dikirim ke server kami.
            </p>

            {/* Row 1: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {tools.slice(0, 3).map((t) => (
                <ToolCard key={t.href} {...t} />
              ))}
            </div>

            {/* Row 2: 1 column */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.slice(3).map((t) => (
                <ToolCard key={t.href} {...t} />
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          className="py-20"
          style={{ background: "var(--surface)" }}
          aria-labelledby="how-heading"
        >
          <div className="max-w-6xl mx-auto px-6">
            <h2
              id="how-heading"
              className="text-2xl font-semibold tracking-tight mb-12"
            >
              Bagaimana cara kerjanya
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="flex flex-col gap-3">
                  <span
                    className="text-4xl font-bold leading-none"
                    style={{
                      color: "var(--accent)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {number}
                  </span>
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--muted)" }}
                  >
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BAGAIMANA INI BEKERJA (PENJELASAN) ── */}
        <section
          className="py-16 border-t border-b"
          style={{ borderColor: "var(--border-solid)" }}
        >
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-xl font-semibold tracking-tight mb-6" style={{ color: "var(--foreground)" }}>
              Bagaimana kindalikepdf Bekerja?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  Pemrosesan Lokal di Browser
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  Saat Anda memilih file PDF, browser Anda membaca data biner berkas tersebut menggunakan pustaka JavaScript lokal. Tidak ada server eksternal yang menerima, mengunduh, atau memproses file Anda. Semua pengerjaan selesai di dalam tab browser Anda sendiri.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  Aplikasi PWA & Akses Offline Penuh
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  kindalikepdf adalah Progressive Web App (PWA) yang dapat dipasang langsung di komputer atau ponsel Anda. Begitu aplikasi terinstal atau dimuat sekali, matikan WiFi atau internet Anda; semua fitur manipulasi PDF tetap berjalan 100% secara offline tanpa kendala.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  Pembersihan Memori Instan
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                  File PDF Anda ditampung sementara di memori RAM perangkat Anda sebagai data objek. Begitu Anda mengunduh file baru hasil pemrosesan atau menutup tab halaman web ini, data tersebut otomatis dihancurkan oleh sistem browser dan tidak menyisakan salinan apa pun.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 border-t"
        style={{ borderColor: "var(--border-solid)" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div>
              <p
                className="text-base font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                kindalikepdf
              </p>
            </div>

            {/* Tool links */}
            <nav
              className="flex flex-wrap gap-x-6 gap-y-2"
              aria-label="Footer tools"
            >
              {tools.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Privacy note */}
            <p
              className="text-xs max-w-xs"
              style={{ color: "var(--muted)" }}
            >
              File Anda tidak pernah disimpan di server kami.
            </p>
          </div>
        </div>
      </footer>

      {/* Global CSS Keyframes for Background Glowing Blobs Animation */}
      <style>{`
        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(60px, -80px) scale(1.15); }
          66% { transform: translate(-30px, 50px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-40px, 60px) scale(0.9); }
          66% { transform: translate(50px, -40px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </>
  );
}
