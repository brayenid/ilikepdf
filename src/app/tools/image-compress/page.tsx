"use client";

import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type OutputFormat = "original" | "jpeg" | "webp";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageCompressPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");
  
  // Settings
  const [quality, setQuality] = useState(0.75);
  const [scale, setScale] = useState(1.0);
  const [format, setFormat] = useState<OutputFormat>("original");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBlob(null);
    setCompressedSize(0);

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
      setOriginalSize(file.size);
      setOutputName(file.name.replace(/\.[^/.]+$/, ""));
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat berkas gambar.");
      setPageState("error");
    }
  }, [imgUrl]);

  const handleCompress = async () => {
    if (!files[0] || !imgUrl) return;
    setPageState("processing");
    setErrorMsg("");

    try {
      const file = files[0].file;
      const img = new Image();
      img.src = imgUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal memuat 2D context canvas.");

      // Calculate new dimensions
      const targetW = img.width * scale;
      const targetH = img.height * scale;
      canvas.width = targetW;
      canvas.height = targetH;

      // Draw image
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Determine format
      let mimeType = file.type;
      if (format === "jpeg") mimeType = "image/jpeg";
      if (format === "webp") mimeType = "image/webp";

      // Compress
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setResultBlob(blob);
            setCompressedSize(blob.size);
            setPageState("done");
          } else {
            throw new Error("Blob conversion returned null.");
          }
        },
        mimeType,
        quality
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengompresi gambar.");
      setPageState("error");
    }
  };

  const handleDownload = async () => {
    if (!resultBlob || !files[0]) return;
    const base = outputName.trim() || "output";
    const file = files[0].file;
    
    // Determine extension
    let ext = file.name.split(".").pop();
    if (format === "jpeg") ext = "jpg";
    if (format === "webp") ext = "webp";

    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}-compressed.${ext}`;
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
      toolName="Kompres Gambar"
      toolHref="/tools/image-compress"
      description="Perkecil ukuran file gambar JPG, PNG, atau WEBP secara 100% lokal langsung di dalam browser."
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
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Pengaturan Kompresi</h3>

            {/* Quality Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between font-medium">
                <label htmlFor="quality-slider" className="text-gray-700">Kualitas Gambar</label>
                <span className="text-teal-600 font-semibold">{Math.round(quality * 100)}%</span>
              </div>
              <input
                id="quality-slider"
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            {/* Scaling Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between font-medium">
                <label htmlFor="scale-slider" className="text-gray-700">Skala Dimensi</label>
                <span className="text-teal-600 font-semibold">{Math.round(scale * 100)}%</span>
              </div>
              <input
                id="scale-slider"
                type="range"
                min={0.2}
                max={1.0}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-650"
                style={{ accentColor: "var(--accent)" }}
              />
            </div>

            {/* Output Format */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="format-select" className="font-medium text-gray-700">Format Output</label>
              <select
                id="format-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as OutputFormat)}
                className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
              >
                <option value="original">Format Asli</option>
                <option value="jpeg">Convert to JPEG (Sangat Ringan)</option>
                <option value="webp">Convert to WEBP (Sangat Optimal)</option>
              </select>
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Sedang mengompresi gambar...
          </p>
        )}

        {/* Done State Size Comparison */}
        {pageState === "done" && (
          <div className="p-4 border rounded-lg bg-[#fafafa] max-w-md flex items-center justify-between text-xs" style={{ borderColor: "var(--border-solid)" }}>
            <div>
              <p className="font-semibold text-gray-500">Ukuran Asli</p>
              <p className="text-sm font-bold text-gray-700">{formatBytes(originalSize)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-teal-600">Ukuran Baru</p>
              <p className="text-sm font-bold text-teal-700">
                {formatBytes(compressedSize)} ({Math.round(((originalSize - compressedSize) / originalSize) * 100)}% lebih kecil!)
              </p>
            </div>
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              onClick={handleCompress}
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
              Kompres Gambar
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
                    -compressed
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
