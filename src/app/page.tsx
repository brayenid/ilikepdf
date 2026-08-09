'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FilePlus,
  Scissors,
  ArrowsDownUp,
  SquaresFour,
  Stamp,
  ShieldCheck,
  MagicWand,
  ArrowsLeftRight,
  FrameCorners,
  ArrowRight,
  Sparkle
} from '@phosphor-icons/react'
import Navbar from '@/components/Navbar'
import { ToolCard, HeroCTA } from '@/components/LandingClient'

const pdfTools = [
  {
    href: '/tools/compress',
    label: 'Kompres PDF',
    description: 'Perkecil ukuran file PDF Anda tanpa mengorbankan kualitas.',
    icon: ArrowsDownUp
  },
  {
    href: '/tools/merge',
    label: 'Gabungkan PDF',
    description: 'Gabungkan beberapa berkas PDF menjadi satu dokumen utuh.',
    icon: FilePlus
  },
  {
    href: '/tools/split',
    label: 'Pisahkan PDF',
    description: 'Pisahkan halaman tertentu dari file PDF Anda menjadi dokumen terpisah.',
    icon: Scissors
  },
  {
    href: '/tools/organize',
    label: 'Kelola Halaman',
    description: 'Susun ulang, hapus, putar, atau sisipkan halaman dalam file PDF.',
    icon: SquaresFour
  },
  {
    href: '/tools/image-to-pdf',
    label: 'Gambar ke PDF',
    description: 'Konversi kumpulan file gambar PNG/JPG menjadi satu dokumen PDF.',
    icon: FrameCorners
  },
  {
    href: '/tools/watermark',
    label: 'Watermark & Nomor',
    description: 'Tambahkan cap teks kustom atau nomor halaman secara otomatis.',
    icon: Stamp
  },
  {
    href: '/tools/protect',
    label: 'Keamanan PDF',
    description: 'Kunci dokumen PDF dengan password atau hapus proteksi sandinya.',
    icon: ShieldCheck
  }
]

const imageTools = [
  {
    href: '/tools/image-compress',
    label: 'Kompres Gambar',
    description: 'Perkecil ukuran file gambar JPG, PNG, atau WEBP secara 100% lokal.',
    icon: ArrowsDownUp
  },
  {
    href: '/tools/image-resize',
    label: 'Ubah Ukuran Gambar',
    description: 'Ubah dimensi lebar dan tinggi piksel gambar Anda secara instan.',
    icon: FrameCorners
  },
  {
    href: '/tools/image-convert',
    label: 'Konverter Gambar',
    description: 'Ubah format file gambar (PNG, JPG, WEBP) langsung di memori browser.',
    icon: ArrowsLeftRight
  },
  {
    href: '/tools/image-watermark',
    label: 'Watermark Gambar',
    description: 'Tambahkan tanda air teks kustom dengan transparansi dan rotasi.',
    icon: Stamp
  },
  {
    href: '/tools/image-remove-bg',
    label: 'Hapus Background',
    description: 'Hapus latar belakang gambar secara otomatis menggunakan AI lokal.',
    icon: MagicWand
  }
]

const steps = [
  {
    number: '01',
    title: 'Upload Berkas',
    description: 'Seret file Anda ke area seret-drop atau klik untuk mengunggah dari perangkat secara lokal.'
  },
  {
    number: '02',
    title: 'Konfigurasi Instan',
    description: 'Susun ulang, atur watermark, kompresi, atau putar halaman secara visual sesuai keinginan.'
  },
  {
    number: '03',
    title: 'Unduh Hasil',
    description: 'Simpan langsung dokumen hasil pemrosesan. Bebas watermark sistem, gratis, dan tanpa registrasi.'
  }
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'pdf' | 'image'>('pdf')

  const currentTools = activeTab === 'pdf' ? pdfTools : imageTools

  return (
    <>
      <Navbar transparent />
      <main className="space-y-24 pb-20">
        {/* ── HERO SECTION ── */}
        <section
          className="min-h-[90dvh] flex flex-col justify-center w-full pt-20 overflow-hidden relative z-10"
          aria-labelledby="hero-heading">
          {/* Subtle Ambient Decorative Gradients */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div
              className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0) 70%)',
                filter: 'blur(100px)'
              }}
            />
            <div
              className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 70%)',
                filter: 'blur(90px)'
              }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            {/* Left Column: Premium Typography Copy */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0d9488]">Stateless & Tanpa Jejak</p>
              <h1
                id="hero-heading"
                className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] text-gray-900">
                Dokumen lokal,
                <br />
                privasi mutlak.
              </h1>
              <p className="text-base text-gray-500 leading-relaxed max-w-[45ch]">
                Kompres, gabung, pisahkan, dan manipulasi berkas PDF atau gambar Anda secara instan di dalam memori
                browser tanpa upload.
              </p>
              <div className="pt-2">
                <HeroCTA />
              </div>
            </div>

            {/* Right Column: Premium Visual Asset */}
            <div className="lg:col-span-6">
              <div
                className="relative overflow-hidden border shadow-2xl bg-white p-2 transition-all duration-300 hover:shadow-teal-100/20"
                style={{
                  borderColor: 'var(--border-solid)',
                  borderRadius: 'var(--radius-card)'
                }}>
                <img
                  src="/hero.jpg?v=3"
                  alt="kindalikepdf abstract illustration"
                  width={1200}
                  height={675}
                  className="w-full h-auto object-cover rounded-md animate-fade-in"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── TOOL GRID WITH TAB SWITCHER ── */}
        <section id="tools" className="max-w-6xl mx-auto px-6 space-y-8" aria-labelledby="tools-heading">
          <div
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6"
            style={{ borderColor: 'var(--border-solid)' }}>
            <div className="space-y-1">
              <h2 id="tools-heading" className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                Manipulasi Berkas Anda
              </h2>
              <p className="text-sm text-gray-500">
                Pilih modul alat di bawah ini untuk memulai pemrosesan biner secara aman.
              </p>
            </div>

            {/* Premium Pill Tab Switcher */}
            <div
              className="inline-flex p-1 bg-gray-50 border rounded-lg self-start md:self-auto"
              style={{ borderColor: 'var(--border-solid)', borderRadius: 'var(--radius-btn)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'pdf' ? 'bg-white text-teal-600 shadow-sm border' : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  borderRadius: 'calc(var(--radius-btn) - 2px)',
                  borderColor: activeTab === 'pdf' ? 'var(--border-solid)' : 'transparent'
                }}>
                Pengolah PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'image'
                    ? 'bg-white text-teal-600 shadow-sm border'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  borderRadius: 'calc(var(--radius-btn) - 2px)',
                  borderColor: activeTab === 'image' ? 'var(--border-solid)' : 'transparent'
                }}>
                Pengolah Gambar
              </button>
            </div>
          </div>

          {/* Grid Layout of Selected Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTools.map((t) => (
              <ToolCard key={t.href} {...t} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS (EDITORIAL STEPPER) ── */}
        <section
          className="py-16 bg-[#fafafa] border-t border-b"
          style={{ borderColor: 'var(--border-solid)' }}
          aria-labelledby="how-heading">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <h2 id="how-heading" className="text-xl font-semibold tracking-tight text-gray-900">
              Alur Kerja Sederhana
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="flex flex-col gap-4 relative">
                  <span
                    className="text-5xl font-extrabold leading-none text-teal-500/20 font-mono tracking-tighter"
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {number}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                    <p className="text-xs leading-relaxed text-gray-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECURITY / PRIVACY EXPLAINER (BENTO GRID) ── */}
        <section className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Local Processing */}
            <div
              className="p-6 border bg-white flex flex-col justify-between h-56"
              style={{ borderColor: 'var(--border-solid)', borderRadius: 'var(--radius-card)' }}>
              <h3 className="text-sm font-semibold text-gray-800">Pemrosesan Lokal di Browser</h3>
              <p className="text-xs leading-relaxed text-gray-400 mt-2">
                Saat Anda memilih berkas, browser Anda langsung membaca data biner berkas tersebut menggunakan pustaka
                JavaScript lokal. Tidak ada server eksternal yang menerima, mengunduh, atau memproses file Anda.
              </p>
            </div>

            {/* Card 2: Offline Access */}
            <div
              className="p-6 border bg-white flex flex-col justify-between h-56"
              style={{ borderColor: 'var(--border-solid)', borderRadius: 'var(--radius-card)' }}>
              <h3 className="text-sm font-semibold text-gray-800">Aplikasi PWA & Akses Offline</h3>
              <p className="text-xs leading-relaxed text-gray-400 mt-2">
                kindalikepdf adalah Progressive Web App (PWA) yang dapat dipasang di komputer atau ponsel. Begitu
                aplikasi terinstal atau dimuat sekali, matikan koneksi internet Anda; semua fitur tetap berjalan 100%
                offline.
              </p>
            </div>

            {/* Card 3: Memory Cleanup */}
            <div
              className="p-6 border bg-[#fafafa] flex flex-col justify-between h-56"
              style={{ borderColor: 'var(--border-solid)', borderRadius: 'var(--radius-card)' }}>
              <h3 className="text-sm font-semibold text-teal-600">Pembersihan Memori Instan</h3>
              <p className="text-xs leading-relaxed text-gray-400 mt-2">
                File Anda ditampung sementara di memori RAM perangkat Anda sebagai data objek. Begitu Anda mengunduh
                hasil pemrosesan atau menutup tab halaman ini, data tersebut otomatis dihancurkan oleh sistem browser
                Anda.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t bg-white" style={{ borderColor: 'var(--border-solid)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs font-semibold text-teal-600">kindalikepdf</p>
          <p className="text-xs text-gray-400">File Anda tidak pernah disimpan di server kami.</p>
        </div>
      </footer>
    </>
  )
}
