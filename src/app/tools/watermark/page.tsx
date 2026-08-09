"use client";

import { useState, useCallback } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

interface WatermarkConfig {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string; // "gray" | "red" | "blue" | "green" | "black"
  opacity: number;
  rotation: number;
}

interface NumberingConfig {
  enabled: boolean;
  position: "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "top-right";
  format: "page" | "page-total" | "raw";
  startFrom: number;
  startFromPage: number; // 1-based index of the physical page to start numbering on
  fontSize: number;
  color: string; // "gray" | "black" | "red" | "blue" | "green"
  opacity: number;
}

export default function WatermarkPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBytes, setResultBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [progress, setProgress] = useState(0);
  const [outputName, setOutputName] = useState("");
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  // Configuration States
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: true,
    text: "CONFIDENTIAL",
    fontSize: 54,
    color: "gray",
    opacity: 0.25,
    rotation: 45,
  });

  const [numbering, setNumbering] = useState<NumberingConfig>({
    enabled: false,
    position: "bottom-center",
    format: "raw", // default is raw number "X" (no "Halaman" text)
    startFrom: 1,
    startFromPage: 1, // default starts drawing on physical page 1
    fontSize: 10,
    color: "black", // default is high contrast black
    opacity: 0.8,
  });

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBytes(null);
    setProgress(0);

    if (newFiles.length === 0) {
      setPdfBuffer(null);
      setOutputName("");
      setPageState("idle");
      return;
    }

    setPageState("loading");
    try {
      const file = newFiles[0].file;
      setOutputName(file.name.replace(/\.pdf$/i, ""));
      const buf = await file.arrayBuffer();
      setPdfBuffer(buf);
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat file PDF.");
      setPageState("error");
    }
  }, []);

  const handleApply = async () => {
    if (!pdfBuffer) return;
    setPageState("processing");
    setProgress(10);
    setErrorMsg("");

    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Color mapping
      const getColor = (c: string) => {
        switch (c) {
          case "red":
            return rgb(0.9, 0.1, 0.1);
          case "blue":
            return rgb(0.1, 0.1, 0.9);
          case "green":
            return rgb(0.1, 0.6, 0.1);
          case "black":
            return rgb(0.0, 0.0, 0.0);
          case "gray":
          default:
            return rgb(0.5, 0.5, 0.5);
        }
      };

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // 1. Draw Watermark
        if (watermark.enabled && watermark.text.trim()) {
          const wColor = getColor(watermark.color);
          const textW = font.widthOfTextAtSize(watermark.text, watermark.fontSize);
          const textH = font.heightAtSize(watermark.fontSize);

          // Center approximation
          const x = width / 2 - textW / 2;
          const y = height / 2 - textH / 2;

          page.drawText(watermark.text, {
            x: x,
            y: y,
            size: watermark.fontSize,
            font: font,
            color: wColor,
            opacity: watermark.opacity,
            rotate: degrees(watermark.rotation),
          });
        }

        // 2. Draw Page Number
        if (numbering.enabled && (i + 1) >= numbering.startFromPage) {
          const currentPageNum = numbering.startFrom + (i - (numbering.startFromPage - 1));
          let label = "";
          if (numbering.format === "page") {
            label = `Halaman ${currentPageNum}`;
          } else if (numbering.format === "page-total") {
            label = `Halaman ${currentPageNum} dari ${pages.length}`;
          } else {
            label = `${currentPageNum}`;
          }

          const textW = font.widthOfTextAtSize(label, numbering.fontSize);
          let numX = width / 2 - textW / 2;
          let numY = 20; // Default bottom center

          // Calculate Position
          if (numbering.position === "bottom-left") {
            numX = 28;
          } else if (numbering.position === "bottom-right") {
            numX = width - textW - 28;
          } else if (numbering.position === "top-left") {
            numX = 28;
            numY = height - 28;
          } else if (numbering.position === "top-center") {
            numX = width / 2 - textW / 2;
            numY = height - 28;
          } else if (numbering.position === "top-right") {
            numX = width - textW - 28;
            numY = height - 28;
          }

          const numColor = getColor(numbering.color);

          page.drawText(label, {
            x: numX,
            y: numY,
            size: numbering.fontSize,
            font: font,
            color: numColor,
            opacity: numbering.opacity,
          });
        }

        setProgress(Math.round(((i + 1) / pages.length) * 90) + 10);
      }

      const raw = await pdfDoc.save();
      const bytes = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) as Uint8Array<ArrayBuffer>;
      setResultBytes(bytes);
      setProgress(100);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses file PDF.");
      setPageState("error");
    }
  };

  const handleDownload = useCallback(async () => {
    if (!resultBytes) return;
    const base = outputName.trim() || "output";
    const fileName = `kindalikepdf-${base}-watermarked.pdf`;
    await streamDownload(resultBytes, fileName);
  }, [resultBytes, outputName]);

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
      toolName="Watermark & Nomor Halaman"
      toolHref="/tools/watermark"
      description="Tambahkan tanda air (watermark) atau nomor halaman ke dokumen PDF Anda secara mudah, instan, dan 100% lokal."
    >
      <div className="space-y-6">
        <DropZone
          accept=".pdf"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Configurations */}
        {pageState === "ready" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-white" style={{ borderColor: "var(--border-solid)" }}>
            {/* Watermark Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="watermark-toggle"
                  type="checkbox"
                  checked={watermark.enabled}
                  onChange={(e) => setWatermark((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="watermark-toggle" className="text-sm font-semibold text-gray-900">
                  Terapkan Tanda Air (Watermark)
                </label>
              </div>

              {watermark.enabled && (
                <div className="pl-6 space-y-3.5 text-xs text-gray-700">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="watermark-text" className="font-medium text-gray-700">
                      Teks Watermark
                    </label>
                    <input
                      id="watermark-text"
                      type="text"
                      value={watermark.text}
                      onChange={(e) => setWatermark((prev) => ({ ...prev, text: e.target.value }))}
                      className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="watermark-size" className="font-medium text-gray-700">
                        Ukuran Font
                      </label>
                      <input
                        id="watermark-size"
                        type="number"
                        min={12}
                        max={120}
                        value={watermark.fontSize}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, fontSize: parseInt(e.target.value, 10) || 12 }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="watermark-color" className="font-medium text-gray-700">
                        Warna Teks
                      </label>
                      <select
                        id="watermark-color"
                        value={watermark.color}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, color: e.target.value }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      >
                        <option value="gray">Abu-Abu</option>
                        <option value="black">Hitam</option>
                        <option value="red">Merah</option>
                        <option value="blue">Biru</option>
                        <option value="green">Hijau</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="watermark-opacity" className="font-medium text-gray-700">
                        Transparansi ({Math.round(watermark.opacity * 100)}%)
                      </label>
                      <input
                        id="watermark-opacity"
                        type="range"
                        min={0.05}
                        max={1.0}
                        step={0.05}
                        value={watermark.opacity}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="watermark-rot" className="font-medium text-gray-700">
                        Kemiringan ({watermark.rotation}°)
                      </label>
                      <input
                        id="watermark-rot"
                        type="range"
                        min={0}
                        max={360}
                        step={15}
                        value={watermark.rotation}
                        onChange={(e) => setWatermark((prev) => ({ ...prev, rotation: parseInt(e.target.value, 10) }))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Numbering Section */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6" style={{ borderColor: "var(--border-solid)" }}>
              <div className="flex items-center gap-2">
                <input
                  id="numbering-toggle"
                  type="checkbox"
                  checked={numbering.enabled}
                  onChange={(e) => setNumbering((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="numbering-toggle" className="text-sm font-semibold text-gray-900">
                  Terapkan Nomor Halaman
                </label>
              </div>

              {numbering.enabled && (
                <div className="pl-6 space-y-3.5 text-xs text-gray-700">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="numbering-pos" className="font-medium text-gray-700">
                      Posisi Nomor
                    </label>
                    <select
                      id="numbering-pos"
                      value={numbering.position}
                      onChange={(e) => setNumbering((prev) => ({ ...prev, position: e.target.value as any }))}
                      className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <option value="bottom-left">Kiri Bawah</option>
                      <option value="bottom-center">Tengah Bawah</option>
                      <option value="bottom-right">Kanan Bawah</option>
                      <option value="top-left">Kiri Atas</option>
                      <option value="top-center">Tengah Atas</option>
                      <option value="top-right">Kanan Atas</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="numbering-format" className="font-medium text-gray-700">
                        Format Teks
                      </label>
                      <select
                        id="numbering-format"
                        value={numbering.format}
                        onChange={(e) => setNumbering((prev) => ({ ...prev, format: e.target.value as any }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      >
                        <option value="raw">Angka Saja (X)</option>
                        <option value="page-total">Halaman X dari Y</option>
                        <option value="page">Halaman X</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="numbering-start-page" className="font-medium text-gray-700">
                        Mulai di Halaman
                      </label>
                      <input
                        id="numbering-start-page"
                        type="number"
                        min={1}
                        value={numbering.startFromPage}
                        onChange={(e) => setNumbering((prev) => ({ ...prev, startFromPage: parseInt(e.target.value, 10) || 1 }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                        title="Tentukan halaman fisik mana penomoran ini mulai disisipkan (berguna untuk melewati cover)"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="numbering-start" className="font-medium text-gray-700">
                        Mulai dari Angka
                      </label>
                      <input
                        id="numbering-start"
                        type="number"
                        min={1}
                        value={numbering.startFrom}
                        onChange={(e) => setNumbering((prev) => ({ ...prev, startFrom: parseInt(e.target.value, 10) || 1 }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="numbering-size" className="font-medium text-gray-700">
                        Ukuran Font
                      </label>
                      <input
                        id="numbering-size"
                        type="number"
                        min={8}
                        max={36}
                        value={numbering.fontSize}
                        onChange={(e) => setNumbering((prev) => ({ ...prev, fontSize: parseInt(e.target.value, 10) || 8 }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="numbering-color" className="font-medium text-gray-700">
                        Warna Nomor
                      </label>
                      <select
                        id="numbering-color"
                        value={numbering.color}
                        onChange={(e) => setNumbering((prev) => ({ ...prev, color: e.target.value }))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      >
                        <option value="black">Hitam (Jelas)</option>
                        <option value="gray">Abu-Abu</option>
                        <option value="red">Merah</option>
                        <option value="blue">Biru</option>
                        <option value="green">Hijau</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="numbering-opacity" className="font-medium text-gray-700">
                      Transparansi ({Math.round(numbering.opacity * 100)}%)
                    </label>
                    <input
                      id="numbering-opacity"
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={numbering.opacity}
                      onChange={(e) => setNumbering((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing state */}
        {pageState === "processing" && (
          <div className="p-4 border rounded-lg bg-[#fafafa]">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--accent-muted)" }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "var(--accent)", borderRadius: "9999px" }}
              />
            </div>
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <SpinnerGap size={13} className="animate-spin" />
              Memproses dokumen... {progress}%
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              onClick={handleApply}
              disabled={pageState !== "ready" || (!watermark.enabled && !numbering.enabled)}
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
              Terapkan Perubahan
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
                    -watermarked.pdf
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label="Unduh PDF Baru" />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    setPdfBuffer(null);
                    setOutputName("");
                    setResultBytes(null);
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
