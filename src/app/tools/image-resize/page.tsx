"use client";

import { useState, useCallback, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "error";

export default function ImageResizePage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");

  // Dimensions configuration
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [lockRatio, setLockRatio] = useState(true);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // Background processing state (for debounced canvas resizing)
  const [isResizing, setIsResizing] = useState(false);

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBlob(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);

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
  }, [imgUrl, resultUrl]);

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

  // Debounced real-time canvas resizing
  useEffect(() => {
    if (!files[0] || !imgUrl || width === "" || height === "") {
      setResultBlob(null);
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    setIsResizing(true);
    setErrorMsg("");

    const debounceTimer = setTimeout(async () => {
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
            const url = URL.createObjectURL(blob);
            setResultUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
            setResultBlob(blob);
          } else {
            throw new Error("Gagal mengubah ukuran gambar.");
          }
          setIsResizing(false);
        }, files[0].file.type, 0.95);
      } catch (err) {
        console.error(err);
        setErrorMsg("Gagal mengubah ukuran gambar.");
        setIsResizing(false);
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [width, height, imgUrl, files]);

  const handleDownload = async () => {
    if (!resultBlob || !files[0]) return;
    const base = outputName.trim() || "output";
    const ext = files[0].file.name.split(".").pop();
    const bytes = new Uint8Array(await resultBlob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const fileName = `kindalikepdf-${base}-resized.${ext}`;
    await streamDownload(bytes, fileName);
  };

  const dropState =
    pageState === "loading"
      ? "processing"
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
        
        {/* Render full-width DropZone ONLY in idle/loading states when no files are loaded */}
        {files.length === 0 && (
          <DropZone
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple={false}
            files={files}
            onFilesChange={handleFilesChange}
            state={dropState}
          />
        )}

        {pageState === "ready" && imgUrl && (
          <div className="w-full space-y-6">
            
            {/* Top Section: Previews sharing 1fr each (50/50 split) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500">Gambar Asli ({origWidth}x{origHeight} px)</h4>
                <div className="border rounded-lg bg-gray-50 p-3 flex items-center justify-center h-80 relative" style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-card)" }}>
                  <img src={imgUrl} alt="Original" className="max-h-full object-contain rounded shadow-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-teal-600 flex items-center gap-1.5">
                  Pratinjau Hasil ({width || 0}x{height || 0} px)
                  {isResizing && <SpinnerGap size={12} className="animate-spin text-teal-600" />}
                </h4>
                <div className="border rounded-lg bg-gray-50 p-3 flex items-center justify-center h-80 relative overflow-hidden" style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-card)" }}>
                  {resultUrl ? (
                    <img 
                      src={resultUrl} 
                      alt="Resized" 
                      className={`max-h-full object-contain rounded shadow-sm transition-opacity duration-200 ${isResizing ? "opacity-50" : "opacity-100"}`} 
                    />
                  ) : (
                    <div className="text-xs text-gray-400 flex flex-col items-center gap-2">
                      <SpinnerGap size={18} className="animate-spin" />
                      Memuat pratinjau...
                    </div>
                  )}
                  {isResizing && (
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="bg-white/90 border px-3 py-1.5 rounded-full shadow-sm text-[10px] text-gray-600 flex items-center gap-1.5">
                        <SpinnerGap size={11} className="animate-spin text-teal-600" />
                        Memproses...
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Section: Single Unified Box (Upload on the Left, Settings on the Right) */}
            <div 
              className="p-6 border rounded-lg bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start"
              style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-card)" }}
            >
              
              {/* Left Column (lg:col-span-5): Upload Status Dropzone */}
              <div className="lg:col-span-5 space-y-2 w-full">
                <label className="text-xs font-semibold text-gray-500 block">Berkas Diunggah</label>
                <DropZone
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple={false}
                  files={files}
                  onFilesChange={handleFilesChange}
                  state={dropState}
                />
              </div>

              {/* Right Column (lg:col-span-7): Resizing Inputs & Download Actions */}
              <div className="lg:col-span-7 space-y-6 w-full lg:border-l lg:pl-6" style={{ borderColor: "var(--border-solid)" }}>
                
                {/* Inputs Row */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dimensi Gambar Baru</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 text-xs">
                      <label htmlFor="width-input" className="font-semibold text-gray-500">Lebar (px)</label>
                      <input
                        id="width-input"
                        type="number"
                        value={width}
                        onChange={(e) => handleWidthChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none text-xs"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                        placeholder="Lebar"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs">
                      <label htmlFor="height-input" className="font-semibold text-gray-500">Tinggi (px)</label>
                      <input
                        id="height-input"
                        type="number"
                        value={height}
                        onChange={(e) => handleHeightChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                        className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none text-xs"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                        placeholder="Tinggi"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <input
                      id="lock-ratio-toggle"
                      type="checkbox"
                      checked={lockRatio}
                      onChange={(e) => setLockRatio(e.target.checked)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="lock-ratio-toggle" className="font-semibold text-gray-600 select-none cursor-pointer">
                      Kunci Aspek Rasio ({origWidth} ⇄ {origHeight})
                    </label>
                  </div>
                </div>

                {/* Filename & Actions Row */}
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border-solid)" }}>
                  <div className="flex flex-col gap-1.5 w-full text-xs">
                    <label htmlFor="filename-input" className="font-semibold text-gray-500">
                      Nama File Unduhan
                    </label>
                    <div
                      className="flex items-center border bg-white overflow-hidden"
                      style={{
                        borderColor: "var(--border-solid)",
                        borderRadius: "var(--radius-btn)",
                      }}
                    >
                      <span className="px-3 py-2 bg-[#fafafa] border-r select-none shrink-0 text-gray-400" style={{ borderColor: "var(--border-solid)" }}>
                        kindalikepdf-
                      </span>
                      <input
                        id="filename-input"
                        type="text"
                        value={outputName}
                        onChange={(e) => setOutputName(e.target.value)}
                        className="flex-1 px-3 py-2 focus:outline-none bg-white text-gray-900"
                        placeholder="nama-file"
                      />
                      <span className="px-3 py-2 bg-[#fafafa] border-l select-none shrink-0 text-gray-400" style={{ borderColor: "var(--border-solid)" }}>
                        -resized
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1">
                      <DownloadButton onDownload={handleDownload} label="Unduh Gambar" disabled={isResizing || !resultBlob} />
                    </div>
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
                      }}
                      className="px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150"
                    >
                      Mulai ulang
                    </button>
                  </div>
                </div>

              </div>

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
      </div>
    </ToolLayout>
  );
}
