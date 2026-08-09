"use client";

import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type TargetFormat = "png" | "jpeg" | "webp";

export default function ImageConvertPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");

  const [targetFormat, setTargetFormat] = useState<TargetFormat>("png");
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBlob(null);

    if (newFiles.length === 0) {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      setImgUrl(null);
      setOutputName("");
      setPageState("idle");
      return;
    }

    setPageState("loading");
    try {
      const file = newFiles[0].file;
      setOutputName(file.name.replace(/\.[^/.]+$/, ""));
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat berkas gambar.");
      setPageState("error");
    }
  }, [imgUrl]);

  const handleConvert = async () => {
    if (!files[0] || !imgUrl) return;
    setPageState("processing");
    setErrorMsg("");

    try {
      const img = new Image();
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal memuat 2D context canvas.");

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw white background if converting PNG/WEBP with transparency to JPEG
      if (targetFormat === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mime = `image/${targetFormat}`;
      canvas.toBlob((blob) => {
        if (blob) {
          setResultBlob(blob);
          setPageState("done");
        } else {
          throw new Error("Gagal mengonversi gambar.");
        }
      }, mime, 0.95);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses konversi gambar.");
      setPageState("error");
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;
    const base = outputName.trim() || "output";
    const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;
    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}.${ext}`;
    await streamDownload(bytes, fileName);
  };

  const dropState =
    pageState === "processing" || pageState === "loading"
      ? "processing"
      : pageState === "done"
      ? "done"
      : files.length > 0
      ? "loaded"
      : "idle";

  return (
    <ToolLayout
      toolName="Konverter Gambar"
      toolHref="/tools/image-convert"
      description="Konversi format gambar PNG, JPG, dan WEBP secara lokal di browser tanpa server."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Configurations */}
        {pageState === "ready" && (
          <div className="p-6 border rounded-lg bg-white max-w-md space-y-4 text-xs text-gray-700" style={{ borderColor: "var(--border-solid)" }}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Konfigurasi Output</h3>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="target-format-select" className="font-medium text-gray-700">Konversi ke Format</label>
              <select
                id="target-format-select"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}
                className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
              >
                <option value="png">PNG (Transparan & Lossless)</option>
                <option value="jpeg">JPG (Kompresi Standar)</option>
                <option value="webp">WEBP (Format Modern & Ringan)</option>
              </select>
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Sedang mengonversi gambar...
          </p>
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              onClick={handleConvert}
              disabled={pageState !== "ready"}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (pageState === "ready")
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              }}
            >
              Konversi Sekarang
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
                    .{targetFormat === "jpeg" ? "jpg" : targetFormat}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label="Unduh Gambar" />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    if (imgUrl) URL.revokeObjectURL(imgUrl);
                    setImgUrl(null);
                    setOutputName("");
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
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
