"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FilePlus,
  Scissors,
  ArrowsDownUp,
  SquaresFour,
  List,
  X,
  CaretDown,
  Image as ImageIcon,
  ShieldCheck,
  Stamp,
  MagicWand,
  ArrowsLeftRight,
  FrameCorners,
} from "@phosphor-icons/react";

const tools = [
  { href: "/tools/compress", label: "Kompres", icon: ArrowsDownUp },
  { href: "/tools/merge", label: "Gabungkan", icon: FilePlus },
  { href: "/tools/split", label: "Pisahkan", icon: Scissors },
  { href: "/tools/organize", label: "Kelola Halaman", icon: SquaresFour },
];

const otherTools = [
  {
    groupLabel: "Pengolahan Gambar",
    items: [
      {
        href: "/tools/image-to-pdf",
        label: "Gambar ke PDF",
        icon: ImageIcon,
        desc: "Konversi gambar PNG/JPG ke PDF secara cepat",
      },
      {
        href: "/tools/image-compress",
        label: "Kompres Gambar",
        icon: ArrowsDownUp,
        desc: "Perkecil ukuran file JPG, PNG, atau WEBP",
      },
      {
        href: "/tools/image-resize",
        label: "Ubah Ukuran Gambar",
        icon: FrameCorners,
        desc: "Ubah dimensi lebar dan tinggi piksel gambar",
      },
      {
        href: "/tools/image-convert",
        label: "Konverter Gambar",
        icon: ArrowsLeftRight,
        desc: "Ubah format file JPG, PNG, atau WEBP",
      },
      {
        href: "/tools/image-watermark",
        label: "Watermark Gambar",
        icon: Stamp,
        desc: "Bubuhkan cap teks kustom ke atas gambar",
      },
      {
        href: "/tools/image-remove-bg",
        label: "Hapus Background",
        icon: MagicWand,
        desc: "Hilangkan latar belakang gambar otomatis via AI",
      },
    ],
  },
  {
    groupLabel: "Keamanan & Utilitas",
    items: [
      {
        href: "/tools/watermark",
        label: "Watermark & Nomor",
        icon: Stamp,
        desc: "Tambahkan tanda air atau penomoran halaman",
      },
      {
        href: "/tools/protect",
        label: "Keamanan PDF",
        icon: ShieldCheck,
        desc: "Kunci atau buka kunci proteksi kata sandi PDF",
      },
    ],
  },
];

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check if any of the tools in the dropdown are currently active
  const isDropdownActive = otherTools.some((group) =>
    group.items.some((item) => pathname.startsWith(item.href))
  );

  return (
    <header
      className={`z-50 w-full sticky top-0 transition-all duration-200 ${
        transparent
          ? "bg-white/40 backdrop-blur-md"
          : "bg-white border-b"
      }`}
      style={{
        borderColor: transparent ? "transparent" : "var(--border-solid)",
        borderBottomWidth: transparent ? "0px" : "1px",
        height: "64px",
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between gap-8"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
          aria-label="kindalikepdf beranda"
        >
          <img
            src="/kindalike.png"
            alt="Logo kindalikepdf"
            className="w-7 h-7 object-contain"
            style={{ borderRadius: "var(--radius-btn)" }}
          />
          <span className="font-semibold text-base tracking-tight text-[#111111]">
            kindalikepdf
          </span>
        </Link>

        {/* Desktop Nav links */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Navigasi tool"
        >
          {tools.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors duration-150"
                style={{
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  borderRadius: "var(--radius-btn)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--foreground)";
                    e.currentTarget.style.background = "var(--surface)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={15} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}

          {/* Dropdown "Lainnya" */}
          <div
            className="relative"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors duration-150 font-medium"
              style={{
                color: isDropdownActive ? "var(--accent)" : "var(--muted)",
                background: isDropdownActive ? "var(--accent-muted)" : "transparent",
                borderRadius: "var(--radius-btn)",
              }}
            >
              Lainnya
              <CaretDown size={10} weight="bold" className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full pt-2 z-50 w-[560px]">
                <div
                  className="bg-white border shadow-lg p-5 grid grid-cols-2 gap-6"
                  style={{
                    borderColor: "var(--border-solid)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  {otherTools.map((group) => (
                    <div key={group.groupLabel} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none px-2 mb-2 border-b pb-1.5" style={{ borderColor: "var(--border-solid)" }}>
                        {group.groupLabel}
                      </p>
                      <div className="flex flex-col gap-1">
                        {group.items.map(({ href, label, icon: Icon, desc }) => {
                          const isItemActive = pathname.startsWith(href);
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-start gap-2.5 p-2 rounded transition-colors duration-150 hover:bg-[#fafafa]"
                              style={{
                                color: isItemActive ? "var(--accent)" : "var(--foreground)",
                                borderRadius: "var(--radius-btn)",
                              }}
                            >
                              <Icon size={16} className="mt-0.5 shrink-0" style={{ color: isItemActive ? "var(--accent)" : "var(--muted)" }} />
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-semibold">{label}</span>
                                <span className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{desc}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile: Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            className="p-2 transition-colors duration-150 rounded"
            style={{
              color: "var(--muted)",
              borderRadius: "var(--radius-btn)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            {isOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {isOpen && (
        <div
          className="md:hidden absolute top-[64px] left-0 w-full bg-white border-b p-4 shadow-lg z-40 flex flex-col gap-1.5 transition-all duration-150 max-h-[calc(100vh-64px)] overflow-y-auto"
          style={{
            borderColor: "var(--border-solid)",
          }}
        >
          {tools.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-[#fafafa]"
                style={{
                  color: isActive ? "var(--accent)" : "var(--muted)",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  borderRadius: "var(--radius-btn)",
                }}
              >
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}

          {/* Grouped Dropdown for Mobile */}
          {otherTools.map((group) => (
            <div key={group.groupLabel} className="pt-2 border-t mt-2" style={{ borderColor: "var(--border-solid)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 mb-2 select-none">
                {group.groupLabel}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 hover:bg-[#fafafa]"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--muted)",
                      background: isActive ? "var(--accent-muted)" : "transparent",
                      borderRadius: "var(--radius-btn)",
                    }}
                  >
                    <Icon size={18} weight={isActive ? "fill" : "regular"} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
