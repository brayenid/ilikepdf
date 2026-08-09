"use client";

import { useState, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle, MagicWand, Sparkle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

export default function ImageRemoveBgPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setProgressPercent(0);

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
  }, [imgUrl, resultUrl]);

  const handleRemoveBackground = async () => {
    if (!files[0]) return;
    setPageState("processing");
    setErrorMsg("");
    setProgressPercent(0);
    setStatusText("Mengunduh model AI & memuat aset (hanya sekali)...");

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      
      setStatusText("Sedang menghapus latar belakang gambar secara lokal...");
      const file = files[0].file;
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          const pct = Math.round((current / total) * 100) || 0;
          setProgressPercent(pct);
          if (key === "fetch") {
            setStatusText(`Mengunduh modul model AI...`);
          } else if (key === "compute") {
            setStatusText(`Memproses objek gambar...`);
          }
        }
      });

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBlob(blob);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menghapus background. Pastikan browser Anda mendukung WebAssembly.");
      setPageState("error");
    }
  };

  const handleDownload = async () => {
    if (!resultBlob) return;
    const base = outputName.trim() || "output";
    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}-nobg.png`;
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
      toolName="Hapus Background Gambar"
      toolHref="/tools/image-remove-bg"
      description="Hapus latar belakang foto atau gambar secara otomatis 100% lokal langsung di dalam browser Anda (Aman & Privat)."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Previews (Before vs After) */}
        {pageState === "ready" && imgUrl && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500">Pratinjau Gambar Asli</h4>
            <div className="border rounded-lg bg-gray-50 p-3 max-w-sm flex items-center justify-center" style={{ borderColor: "var(--border-solid)" }}>
              <img src={imgUrl} alt="Original" className="max-h-60 object-contain rounded shadow-sm" />
            </div>
            <div className="p-4 border rounded-lg bg-white max-w-md text-xs text-gray-500" style={{ borderColor: "var(--border-solid)" }}>
              <p>
                Proses penghapusan background menggunakan model kecerdasan buatan (AI) yang diunduh dan dijalankan sepenuhnya di sisi komputer/ponsel Anda. Data gambar tidak pernah diunggah ke internet.
              </p>
            </div>
          </div>
        )}

        {pageState === "done" && imgUrl && resultUrl && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500">Gambar Asli</h4>
              <div className="border rounded-lg bg-gray-50 p-3 flex items-center justify-center h-64" style={{ borderColor: "var(--border-solid)" }}>
                <img src={imgUrl} alt="Original" className="max-h-full object-contain rounded shadow-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-teal-600">Tanpa Background (Transparan)</h4>
              <div
                className="border rounded-lg p-3 flex items-center justify-center h-64"
                style={{
                  borderColor: "var(--border-solid)",
                  backgroundImage: "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#ffffff",
                }}
              >
                <img src={resultUrl} alt="No Background" className="max-h-full object-contain drop-shadow-md" />
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-[#fafafa] max-w-sm space-y-4 text-center mx-auto" style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-card)" }}>
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Native SVG animations (rendered by browser compositor thread so they never freeze during WASM load) */}
              <svg width="96" height="96" viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                {/* Outer dashed circle spinning slowly */}
                <circle cx="50" cy="50" r="44" stroke="var(--accent)" strokeWidth="3" strokeDasharray="6 6" fill="none" opacity="0.3">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="10s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Inner smooth arc spinning fast */}
                <circle cx="50" cy="50" r="36" stroke="var(--accent)" strokeWidth="4" strokeDasharray="80" strokeDashoffset="25" fill="none" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
              {/* MagicWand icon pulsing in center */}
              <div className="relative z-10 p-3 bg-white rounded-full shadow-sm flex items-center justify-center border" style={{ borderColor: "var(--border-solid)" }}>
                <MagicWand size={28} className="text-teal-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-800 flex items-center justify-center gap-1.5">
                <Sparkle size={14} className="text-teal-500 animate-pulse" />
                {statusText}
              </p>
              <p className="text-[10px] text-gray-400">
                Proses berjalan 100% aman dan lokal di memori perangkat Anda
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
              onClick={handleRemoveBackground}
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
              Hapus Background Sekarang
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
                    -nobg.png
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label="Unduh Gambar (PNG)" />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    if (imgUrl) URL.revokeObjectURL(imgUrl);
                    setImgUrl(null);
                    if (resultUrl) URL.revokeObjectURL(resultUrl);
                    setResultUrl(null);
                    setOutputName("");
                    setResultBlob(null);
                    setProgressPercent(0);
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
