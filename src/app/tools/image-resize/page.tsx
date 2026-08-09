"use client";

import { useState, useCallback, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

export default function ImageResizePage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");

  // Dimensions configuration
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [lockRatio, setLockRatio] = useState(true);
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
      setOrigWidth(0);
      setOrigHeight(0);
      setWidth("");
      setHeight("");
      setPageState("idle");
      return;
    }

    setPageState("loading");
    try {
      const file = newFiles[0].file;
      setOutputName(file.name.replace(/\.[^/.]+$/, ""));
      const url = URL.createObjectURL(file);
      setImgUrl(url);

      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          setOrigWidth(img.width);
          setOrigHeight(img.height);
          setWidth(img.width);
          setHeight(img.height);
          resolve(null);
        };
        img.onerror = reject;
      });
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat berkas gambar.");
      setPageState("error");
    }
  }, [imgUrl]);

  // Handle aspect ratio sync
  const handleWidthChange = (val: number | "") => {
    setWidth(val);
    if (val !== "" && lockRatio && origWidth > 0 && origHeight > 0) {
      setHeight(Math.round((val * origHeight) / origWidth));
    }
  };

  const handleHeightChange = (val: number | "") => {
    setHeight(val);
    if (val !== "" && lockRatio && origWidth > 0 && origHeight > 0) {
      setWidth(Math.round((val * origWidth) / origHeight));
    }
  };

  const handleResize = async () => {
    if (!files[0] || !imgUrl || width === "" || height === "") return;
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

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          setResultBlob(blob);
          setPageState("done");
        } else {
          throw new Error("Gagal mengubah ukuran gambar.");
        }
      }, files[0].file.type, 0.95);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses pengubahan ukuran gambar.");
      setPageState("error");
    }
  };

  const handleDownload = async () => {
    if (!resultBlob || !files[0]) return;
    const base = outputName.trim() || "output";
    const ext = files[0].file.name.split(".").pop();
    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}-resized.${ext}`;
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
      toolName="Ubah Ukuran Gambar"
      toolHref="/tools/image-resize"
      description="Ubah dimensi lebar dan tinggi berkas gambar PNG, JPG, atau WEBP secara instan 100% lokal."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Configuration inputs */}
        {pageState === "ready" && (
          <div className="p-6 border rounded-lg bg-white max-w-md space-y-4 text-xs text-gray-700" style={{ borderColor: "var(--border-solid)" }}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Dimensi Gambar Baru</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="width-input" className="font-medium text-gray-700">Lebar (px)</label>
                <input
                  id="width-input"
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                  style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  placeholder="Lebar"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="height-input" className="font-medium text-gray-700">Tinggi (px)</label>
                <input
                  id="height-input"
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                  style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  placeholder="Tinggi"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="lock-ratio-toggle"
                type="checkbox"
                checked={lockRatio}
                onChange={(e) => setLockRatio(e.target.checked)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="lock-ratio-toggle" className="font-medium text-gray-700 select-none">
                Kunci Aspek Rasio ({origWidth} ⇄ {origHeight})
              </label>
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Sedang mengubah ukuran gambar...
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

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              onClick={handleResize}
              disabled={pageState !== "ready" || width === "" || height === ""}
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
              Ubah Ukuran Sekarang
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
                    -resized
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
