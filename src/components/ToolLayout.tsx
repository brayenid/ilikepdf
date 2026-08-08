import Link from "next/link";
import { CaretRight, House } from "@phosphor-icons/react/dist/ssr";
import { ReactNode } from "react";
import Navbar from "./Navbar";

interface ToolLayoutProps {
  toolName: string;
  toolHref: string;
  description: string;
  children: ReactNode;
}

export default function ToolLayout({
  toolName,
  toolHref,
  description,
  children,
}: ToolLayoutProps) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 mb-8 text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="flex items-center gap-1 transition-colors duration-150"
              style={{ color: "var(--muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--foreground)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
            >
              <House size={14} weight="regular" />
              Beranda
            </Link>
            <CaretRight size={12} style={{ color: "var(--border-solid)" }} />
            <span style={{ color: "var(--foreground)" }} className="font-medium">
              {toolName}
            </span>
          </nav>

          {/* Tool header */}
          <div className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              {toolName}
            </h1>
            <p className="text-base max-w-xl" style={{ color: "var(--muted)" }}>
              {description}
            </p>
          </div>

          {/* Tool content */}
          {children}
        </div>
      </main>

      {/* Minimal footer for tool pages */}
      <footer
        className="border-t mt-auto py-6"
        style={{ borderColor: "var(--border-solid)" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/"
            className="text-sm font-semibold"
            style={{ color: "var(--accent)" }}
          >
            kindalikepdf
          </Link>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            File diproses di browser Anda. Tidak ada data yang disimpan ke server.
          </p>
        </div>
      </footer>
    </>
  );
}
