"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { ElementType } from "react";

interface ToolCardProps {
  href: string;
  label: string;
  description: string;
  icon: ElementType;
}

export function ToolCard({ href, label, description, icon: Icon }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 p-6 border bg-white transition-all duration-200"
      style={{
        border: `1px solid var(--border-solid)`,
        borderRadius: "var(--radius-card)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          "rgba(13,148,136,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          "var(--border-solid)";
      }}
    >
      <div
        className="w-9 h-9 flex items-center justify-center transition-colors duration-200 group-hover:bg-teal-100"
        style={{
          background: "var(--accent-muted)",
          borderRadius: "var(--radius-btn)",
        }}
      >
        <Icon size={18} weight="regular" style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <p
          className="text-sm font-semibold mb-1 group-hover:text-teal-600 transition-colors duration-150"
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </p>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          {description}
        </p>
      </div>
      <span
        className="mt-auto text-xs font-medium flex items-center gap-1"
        style={{ color: "var(--accent)" }}
      >
        Buka tool
        <ArrowRight
          size={12}
          weight="bold"
          className="transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export function HeroCTA() {
  return (
    <Link
      href="#tools"
      id="cta-primary"
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150"
      style={{
        background: "var(--accent)",
        borderRadius: "var(--radius-btn)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          "var(--accent-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)";
      }}
    >
      Mulai sekarang
      <ArrowRight size={15} weight="bold" />
    </Link>
  );
}
