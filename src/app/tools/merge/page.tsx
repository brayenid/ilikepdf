"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "processing" | "done" | "error";

export default function MergePage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [mergedBytes, setMergedBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [outputName, setOutputName] = useState("gabungan");

  usePreventUnload(files.length > 0);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;
    setPageState("processing");
    setErrorMsg("");
    setProgress(0);

    try {
      const merged = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const buffer = await files[i].file.arrayBuffer();
        const doc = await PDFDocument.load(buffer);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const raw = await merged.save();
      const bytes = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) as Uint8Array<ArrayBuffer>;
      setMergedBytes(bytes);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menggabungkan file. Pastikan semua file adalah PDF yang valid.");
      setPageState("error");
    }
  }, [files]);

  const handleDownload = useCallback(async () => {
    if (!mergedBytes) return;
    const base = outputName.trim() || "gabungan";
    await streamDownload(mergedBytes, `kindalikepdf-${base}-merged.pdf`);
  }, [mergedBytes, outputName]);

  const canMerge = files.length >= 2 && pageState === "idle";
  const dropState =
    pageState === "processing"
      ? "processing"
      : pageState === "done"
      ? "done"
      : files.length > 0
      ? "loaded"
      : "idle";

  return (
    <ToolLayout
      toolName="Gabungkan PDF"
      toolHref="/tools/merge"
      description="Satukan dua atau lebih file PDF menjadi satu dokumen. Urutkan file sesuai keinginan sebelum menggabungkan."
    >
      <div className="space-y-6">
        {/* Drop zone */}
        <DropZone
          accept=".pdf"
          multiple
          maxFiles={20}
          files={files}
          onFilesChange={(f) => {
            setFiles(f);
            if (pageState !== "idle") {
              setPageState("idle");
              setMergedBytes(null);
            }
          }}
          state={dropState}
        />

        {/* Validation hint */}
        {files.length === 1 && (
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Tambahkan minimal satu file lagi untuk menggabungkan.
          </p>
        )}

        {/* Progress bar */}
        {pageState === "processing" && (
          <div>
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
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <SpinnerGap size={13} className="animate-spin" />
              Menggabungkan... {progress}%
            </p>
          </div>
        )}

        {/* Error */}
        {pageState === "error" && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
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
              id="merge-btn"
              onClick={handleMerge}
              disabled={!canMerge}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
                borderRadius: "var(--radius-btn)",
              }}
              onMouseEnter={(e) => {
                if (canMerge)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--accent)";
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(0.98)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              {pageState === "processing" ? (
                <>
                  <SpinnerGap size={15} className="animate-spin" />
                  Menggabungkan...
                </>
              ) : (
                "Gabungkan PDF"
              )}
            </button>
          ) : (
            <div className="w-full space-y-4">
              {/* Filename Input */}
              <div className="flex flex-col gap-1.5 w-full max-w-md">
                <label htmlFor="filename-input" className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                  Nama File Unduhan
                </label>
                <div
                  className="flex items-center border bg-white overflow-hidden"
                  style={{
                    borderColor: "var(--border-solid)",
                    borderRadius: "var(--radius-btn)",
                  }}
                >
                  <span className="px-3 py-2 text-xs font-medium bg-[#fafafa] border-r select-none shrink-0" style={{ borderColor: "var(--border-solid)", color: "var(--muted)" }}>
                    kindalikepdf-
                  </span>
                  <input
                    id="filename-input"
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-medium focus:outline-none bg-white text-[var(--foreground)]"
                    placeholder="nama-file"
                  />
                  <span className="px-3 py-2 text-xs font-medium bg-[#fafafa] border-l select-none shrink-0" style={{ borderColor: "var(--border-solid)", color: "var(--muted)" }}>
                    -merged.pdf
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label="Unduh PDF Gabungan" />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    setMergedBytes(null);
                    setOutputName("gabungan");
                  }}
                  className="px-4 py-2.5 text-sm transition-colors duration-150"
                  style={{
                    color: "var(--muted)",
                    borderRadius: "var(--radius-btn)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color =
                      "var(--foreground)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "var(--muted)")
                  }
                >
                  Mulai ulang
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
