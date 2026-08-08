"use client";

import { useState } from "react";
import { DownloadSimple, SpinnerGap, CheckCircle } from "@phosphor-icons/react";

interface DownloadButtonProps {
  onDownload: () => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}

type BtnState = "idle" | "downloading" | "done";

export default function DownloadButton({
  onDownload,
  label = "Unduh Hasil",
  disabled = false,
}: DownloadButtonProps) {
  const [btnState, setBtnState] = useState<BtnState>("idle");

  const handleClick = async () => {
    if (btnState !== "idle" || disabled) return;
    setBtnState("downloading");
    try {
      await onDownload();
      setBtnState("done");
      // Reset after 3s for re-use
      setTimeout(() => setBtnState("idle"), 3000);
    } catch {
      setBtnState("idle");
    }
  };

  return (
    <button
      type="button"
      id="download-btn"
      onClick={handleClick}
      disabled={disabled || btnState === "downloading"}
      aria-live="polite"
      aria-label={
        btnState === "downloading"
          ? "Sedang mengunduh..."
          : btnState === "done"
          ? "Unduhan selesai"
          : label
      }
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background:
          btnState === "done"
            ? "#16a34a"
            : disabled
            ? "var(--border-solid)"
            : "var(--accent)",
        borderRadius: "var(--radius-btn)",
        transform: "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (btnState === "idle" && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--accent-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (btnState === "idle" && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--accent)";
        }
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      {btnState === "downloading" ? (
        <>
          <SpinnerGap
            size={16}
            weight="bold"
            className="animate-spin"
          />
          Mengunduh...
        </>
      ) : btnState === "done" ? (
        <>
          <CheckCircle size={16} weight="fill" />
          Berhasil diunduh
        </>
      ) : (
        <>
          <DownloadSimple size={16} weight="bold" />
          {label}
        </>
      )}
    </button>
  );
}
