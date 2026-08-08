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
} from "@phosphor-icons/react";

const tools = [
  { href: "/tools/compress", label: "Kompres", icon: ArrowsDownUp },
  { href: "/tools/merge", label: "Gabungkan", icon: FilePlus },
  { href: "/tools/split", label: "Pisahkan", icon: Scissors },
  { href: "/tools/organize", label: "Kelola Halaman", icon: SquaresFour },
];

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          className="md:hidden absolute top-[64px] left-0 w-full bg-white border-b p-4 shadow-lg z-40 flex flex-col gap-1.5 transition-all duration-150"
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
        </div>
      )}
    </header>
  );
}
