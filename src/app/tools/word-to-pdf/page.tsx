"use client";

import { useState, useCallback, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";
import DownloadButton from "@/components/DownloadButton";
import { UploadSimple, FileDoc, SpinnerGap, WarningCircle, CheckCircle } from "@phosphor-icons/react";

type PageState = "idle" | "uploading" | "processing" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setPageState("idle");
    setResultBlob(null);
    setErrorMsg("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setPageState("uploading");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setPageState("processing");
      setProgress(5);

      // Simulate smooth progress loader
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 5;
        });
      }, 150);

      const res = await fetch("/api/word-to-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Server error: ${res.status}`);
      }

      setProgress(100);
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: "text/html" });
      setResultBlob(blob);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Konversi gagal. Pastikan file adalah .docx yang valid."
      );
      setPageState("error");
    }
  }, [file]);

  const handleDownload = useCallback(async () => {
    if (!resultBlob) return;
    // Open in new tab — browser print dialog auto-triggers (window.onload = print)
    // User then saves as PDF via the print dialog
    const url = URL.createObjectURL(resultBlob);
    window.open(url, "_blank");
    // Revoke after a delay to allow the tab to load
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [resultBlob]);

  const canConvert = !!file && pageState === "idle";
  const isProcessing = pageState === "uploading" || pageState === "processing";

  const stateLabel: Partial<Record<PageState, string>> = {
    uploading: "Mengunggah file...",
    processing: "Mengonversi ke PDF...",
  };

  return (
    <ToolLayout
      toolName="Word ke PDF"
      toolHref="/tools/word-to-pdf"
      description="Konversi dokumen Microsoft Word (.docx) ke HTML yang bisa dicetak sebagai PDF. Proses di server, file tidak disimpan."
    >
      <div className="space-y-6">
        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          role="button"
          tabIndex={0}
          aria-label="Area upload dokumen Word"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onClick={() => {
            if (pageState === "idle" || !file) inputRef.current?.click();
          }}
          className="relative transition-all duration-200 select-none"
          style={{
            border: isDragging
              ? `2px dashed var(--accent)`
              : `2px dashed var(--border-solid)`,
            borderRadius: "var(--radius-card)",
            background: isDragging ? "var(--accent-muted)" : "var(--surface)",
            padding: file ? "1.5rem" : "3rem 2rem",
            cursor: isProcessing || pageState === "done" ? "default" : "pointer",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          {!file ? (
            <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{
                  background: isDragging ? "var(--accent)" : "var(--border-solid)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <UploadSimple
                  size={22}
                  weight="regular"
                  style={{ color: isDragging ? "#fff" : "var(--muted)" }}
                />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {isDragging ? "Lepas file di sini" : "Seret file Word ke sini"}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  atau{" "}
                  <span
                    className="underline underline-offset-2"
                    style={{ color: "var(--accent)" }}
                  >
                    klik untuk memilih
                  </span>
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  Format diterima: <span className="font-mono">.doc, .docx</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pointer-events-none">
              <FileDoc size={24} weight="regular" style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatBytes(file.size)}
                </p>
              </div>
              {pageState === "done" && (
                <CheckCircle size={18} weight="fill" style={{ color: "var(--accent)" }} />
              )}
            </div>
          )}
        </div>

        {/* Processing states */}
        {isProcessing && (
          <div className="space-y-2">
            {/* Real dynamic progress bar */}
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--accent-muted)" }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "var(--accent)",
                  borderRadius: "9999px",
                }}
              />
            </div>
            <p
              className="text-xs flex items-center gap-1.5"
              style={{ color: "var(--muted)" }}
            >
              <SpinnerGap size={13} className="animate-spin" />
              {stateLabel[pageState]} {progress}%
            </p>
          </div>
        )}

        {/* Error */}
        {pageState === "error" && (
          <div
            className="flex items-start gap-2.5 p-3 text-sm"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "var(--radius-card)",
              color: "#dc2626",
            }}
            role="alert"
          >
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              id="convert-btn"
              onClick={handleConvert}
              disabled={!canConvert}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (canConvert)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              }}
              onMouseDown={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)")
              }
              onMouseUp={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
              }
            >
              {isProcessing ? (
                <>
                  <SpinnerGap size={15} className="animate-spin" />
                  Mengonversi...
                </>
              ) : (
                "Konversi ke PDF"
              )}
            </button>
          ) : (
            <>
              <DownloadButton onDownload={handleDownload} label="Unduh PDF" />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPageState("idle");
                  setResultBlob(null);
                }}
                className="px-4 py-2.5 text-sm transition-colors duration-150"
                style={{ color: "var(--muted)", borderRadius: "var(--radius-btn)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")
                }
              >
                Mulai ulang
              </button>
            </>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          File dikirim ke server hanya untuk proses konversi dan langsung dihapus setelahnya. Tidak ada data yang disimpan.
        </p>
      </div>

      <style>{`
        @keyframes shimmer-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </ToolLayout>
  );
}
