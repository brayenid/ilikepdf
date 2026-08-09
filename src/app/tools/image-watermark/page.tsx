"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type PositionType =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export default function ImageWatermarkPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");

  // Watermark configs
  const [text, setText] = useState("KINDALIKEPDF");
  const [fontSize, setFontSize] = useState(36);
  const [color, setColor] = useState("rgba(0,0,0,0.5)"); // default gray-ish black
  const [opacity, setOpacity] = useState(0.4);
  const [position, setPosition] = useState<PositionType>("middle-center");
  const [rotation, setRotation] = useState(0);

  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Helper to draw watermark on canvas
  const drawWatermarkOnContext = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    imgWidth: number,
    imgHeight: number,
    isReal: boolean
  ) => {
    const scaleFactor = isReal ? 1 : w / imgWidth;
    const size = fontSize * scaleFactor;

    ctx.save();
    ctx.font = `bold ${size}px Arial`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Position coordinates
    let x = w / 2;
    let y = h / 2;
    const padding = 20 * scaleFactor;

    if (position === "top-left") {
      x = padding + size;
      y = padding + size / 2;
      ctx.textAlign = "left";
    } else if (position === "top-center") {
      x = w / 2;
      y = padding + size / 2;
    } else if (position === "top-right") {
      x = w - padding - size;
      y = padding + size / 2;
      ctx.textAlign = "right";
    } else if (position === "middle-left") {
      x = padding + size;
      y = h / 2;
      ctx.textAlign = "left";
    } else if (position === "middle-center") {
      x = w / 2;
      y = h / 2;
    } else if (position === "middle-right") {
      x = w - padding - size;
      y = h / 2;
      ctx.textAlign = "right";
    } else if (position === "bottom-left") {
      x = padding + size;
      y = h - padding - size / 2;
      ctx.textAlign = "left";
    } else if (position === "bottom-center") {
      x = w / 2;
      y = h - padding - size / 2;
    } else if (position === "bottom-right") {
      x = w - padding - size;
      y = h - padding - size / 2;
      ctx.textAlign = "right";
    }

    // Apply rotation
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  // Render live preview on canvas
  useEffect(() => {
    if (!imgUrl || !canvasRef.current || origWidth === 0 || origHeight === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      const maxPreviewWidth = 400;
      const displayScale = maxPreviewWidth / origWidth;
      canvas.width = maxPreviewWidth;
      canvas.height = origHeight * displayScale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw watermark
      drawWatermarkOnContext(ctx, canvas.width, canvas.height, origWidth, origHeight, false);
    };
  }, [imgUrl, text, fontSize, color, opacity, position, rotation, origWidth, origHeight]);

  const handleWatermark = async () => {
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

      canvas.width = origWidth;
      canvas.height = origHeight;
      ctx.drawImage(img, 0, 0);

      // Draw real size watermark
      drawWatermarkOnContext(ctx, origWidth, origHeight, origWidth, origHeight, true);

      canvas.toBlob((blob) => {
        if (blob) {
          setResultBlob(blob);
          setPageState("done");
        } else {
          throw new Error("Gagal menerapkan watermark.");
        }
      }, files[0].file.type, 0.95);
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses watermark pada gambar.");
      setPageState("error");
    }
  };

  const handleDownload = async () => {
    if (!resultBlob || !files[0]) return;
    const base = outputName.trim() || "output";
    const ext = files[0].file.name.split(".").pop();
    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}-watermarked.${ext}`;
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
      toolName="Watermark Gambar"
      toolHref="/tools/image-watermark"
      description="Tambahkan tanda air (watermark) teks kustom dengan kontrol transparansi dan rotasi di atas gambar Anda."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {pageState === "ready" && (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Visual Preview */}
            <div className="border rounded-lg bg-gray-50 p-4 shrink-0 flex items-center justify-center" style={{ borderColor: "var(--border-solid)" }}>
              <canvas ref={canvasRef} className="max-w-full rounded shadow-sm" />
            </div>

            {/* Configs */}
            <div className="flex-1 max-w-md p-6 border rounded-lg bg-white space-y-4 text-xs text-gray-700" style={{ borderColor: "var(--border-solid)" }}>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Pengaturan Tanda Air</h3>

              {/* Watermark Text */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wm-text-input" className="font-medium text-gray-700">Teks Watermark</label>
                <input
                  id="wm-text-input"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                  style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  placeholder="Ketik teks..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Size */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="wm-size-input" className="font-medium text-gray-700">Ukuran Font (px)</label>
                  <input
                    id="wm-size-input"
                    type="number"
                    min={10}
                    max={120}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 12)}
                    className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                    style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  />
                </div>

                {/* Color */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="wm-color-select" className="font-medium text-gray-700">Warna</label>
                  <select
                    id="wm-color-select"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                    style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  >
                    <option value="rgba(0,0,0,0.5)">Abu-Abu</option>
                    <option value="rgba(0,0,0,0.9)">Hitam</option>
                    <option value="rgba(255,255,255,0.8)">Putih</option>
                    <option value="rgba(239,68,68,0.7)">Merah</option>
                    <option value="rgba(59,130,246,0.7)">Biru</option>
                    <option value="rgba(16,185,129,0.7)">Hijau</option>
                  </select>
                </div>
              </div>

              {/* Position */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="wm-pos-select" className="font-medium text-gray-700">Posisi Grid</label>
                <select
                  id="wm-pos-select"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as PositionType)}
                  className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                  style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                >
                  <option value="top-left">Kiri Atas</option>
                  <option value="top-center">Tengah Atas</option>
                  <option value="top-right">Kanan Atas</option>
                  <option value="middle-left">Kiri Tengah</option>
                  <option value="middle-center">Tengah (Pusat)</option>
                  <option value="middle-right">Kanan Tengah</option>
                  <option value="bottom-left">Kiri Bawah</option>
                  <option value="bottom-center">Tengah Bawah</option>
                  <option value="bottom-right">Kanan Bawah</option>
                </select>
              </div>

              {/* Opacity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-medium">
                  <label htmlFor="wm-opacity-slider" className="text-gray-700">Transparansi</label>
                  <span className="text-teal-600 font-semibold">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  id="wm-opacity-slider"
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              {/* Rotation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between font-medium">
                  <label htmlFor="wm-rot-slider" className="text-gray-700">Kemiringan (Rotasi)</label>
                  <span className="text-teal-600 font-semibold">{rotation}°</span>
                </div>
                <input
                  id="wm-rot-slider"
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-650"
                  style={{ accentColor: "var(--accent)" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Sedang membubuhkan watermark pada gambar...
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
              onClick={handleWatermark}
              disabled={pageState !== "ready" || !text.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (pageState === "ready" && text.trim())
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              }}
            >
              Terapkan Watermark
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
                    -watermarked
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
