"use client";

import { useState, useCallback, useEffect } from "react";
import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type CompressionLevel = "ringan" | "sedang" | "maksimal";
type PageState = "idle" | "processing" | "done" | "error";

const QUALITY_MAP: Record<CompressionLevel, { label: string; desc: string }> = {
  ringan: { label: "Ringan", desc: "Kompresi minimal, kualitas terjaga." },
  sedang: { label: "Sedang", desc: "Keseimbangan ukuran dan kualitas." },
  maksimal: { label: "Maksimal", desc: "Ukuran terkecil, kualitas berkurang." },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompressPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [level, setLevel] = useState<CompressionLevel>("sedang");
  const [compressedFiles, setCompressedFiles] = useState<{ name: string; data: Uint8Array }[]>([]);

  usePreventUnload(files.length > 0);
  const [originalSize, setOriginalSize] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [outputName, setOutputName] = useState("");

  useEffect(() => {
    if (files.length > 0) {
      setOutputName(files[0].file.name.replace(/\.pdf$/i, ""));
    } else {
      setOutputName("");
    }
  }, [files]);

  const handleCompress = useCallback(async () => {
    if (files.length === 0) return;
    setPageState("processing");
    setErrorMsg("");
    setProgress(0);
    setCurrentFileIndex(0);

    const totalOriginalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    setOriginalSize(totalOriginalSize);

    const outputs: { name: string; data: Uint8Array }[] = [];
    const quality = level === "ringan" ? 0.75 : level === "sedang" ? 0.55 : 0.35;

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        const fileItem = files[i];
        const buf = await fileItem.file.arrayBuffer();

        const doc = await PDFDocument.load(buf, {
          ignoreEncryption: true,
        });

        const indirectObjects = doc.context.enumerateIndirectObjects();
        const totalObjects = indirectObjects.length;
        let currentIndex = 0;

        for (const [ref, obj] of indirectObjects) {
          currentIndex++;
          setProgress(Math.round((currentIndex / totalObjects) * 100));

          if (obj instanceof PDFRawStream) {
            const dict = obj.dict;
            const subtype = dict.get(PDFName.of("Subtype"));
            const filter = dict.get(PDFName.of("Filter"));

            if (subtype === PDFName.of("Image") && filter === PDFName.of("DCTDecode")) {
              try {
                const originalBytes = obj.contents as Uint8Array<ArrayBuffer>;
                const blob = new Blob([originalBytes], { type: "image/jpeg" });
                const url = URL.createObjectURL(blob);

                const img = new Image();
                img.src = url;
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                });
                URL.revokeObjectURL(url);

                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
                  const base64Data = compressedDataUrl.split(",")[1];
                  const compressedBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

                  if (compressedBytes.length < originalBytes.length) {
                    (obj as any).contents = compressedBytes;
                    dict.set(PDFName.of("Length"), PDFNumber.of(compressedBytes.length));
                  }
                }
                canvas.width = 0;
                canvas.height = 0;
                img.src = "";
              } catch (e) {
                console.warn("Gagal mengompres objek gambar:", e);
              }
            }
          }
        }

        const saveOptions = { useObjectStreams: true, addDefaultPage: false };
        const raw = await doc.save(saveOptions);
        const compressed = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) as Uint8Array<ArrayBuffer>;

        outputs.push({
          name: fileItem.file.name,
          data: compressed,
        });
      }

      setCompressedFiles(outputs);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memproses file. Pastikan file adalah PDF yang valid.");
      setPageState("error");
    }
  }, [files, level]);

  const handleDownload = useCallback(async () => {
    if (compressedFiles.length === 0) return;

    const base = outputName.trim() || "output";

    if (compressedFiles.length === 1) {
      const single = compressedFiles[0];
      const fileName = `kindalikepdf-${base}-compressed.pdf`;
      await streamDownload(single.data, fileName);
    } else {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      compressedFiles.forEach((file) => {
        const baseName = file.name.replace(/\.pdf$/i, "");
        zip.file(`kindalikepdf-${baseName}-compressed.pdf`, file.data);
      });

      const zipContent = await zip.generateAsync({ type: "blob" });
      await streamDownload(zipContent, `kindalikepdf-${base}-compressed-files.zip`, "application/zip");
    }
  }, [compressedFiles, outputName]);

  const canCompress = files.length > 0 && pageState === "idle";
  const resultSize = compressedFiles.reduce((acc, f) => acc + f.data.length, 0);
  const savings =
    originalSize > 0 && resultSize > 0
      ? Math.max(0, Math.round(((originalSize - resultSize) / originalSize) * 100))
      : 0;

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
      toolName="Kompres PDF"
      toolHref="/tools/compress"
      description="Kurangi ukuran file PDF. Pilih tingkat kompresi sesuai kebutuhan Anda."
    >
      <div className="space-y-6">
        <DropZone
          accept=".pdf"
          multiple={true}
          files={files}
          onFilesChange={(f) => {
            setFiles(f);
            if (pageState !== "idle") {
              setPageState("idle");
              setCompressedFiles([]);
            }
          }}
          state={dropState}
        />

        {/* Level selector */}
        {files.length > 0 && pageState === "idle" && (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
              Tingkat kompresi
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(["ringan", "sedang", "maksimal"] as CompressionLevel[]).map((l) => {
                const active = l === level;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className="flex flex-col gap-1 p-3 border text-left transition-all duration-150"
                    style={{
                      border: active
                        ? `1.5px solid var(--accent)`
                        : `1px solid var(--border-solid)`,
                      borderRadius: "var(--radius-card)",
                      background: active ? "var(--accent-muted)" : "#fff",
                    }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: active ? "var(--accent)" : "var(--foreground)" }}
                    >
                      {QUALITY_MAP[l].label}
                    </span>
                    <span className="text-xs leading-tight" style={{ color: "var(--muted)" }}>
                      {QUALITY_MAP[l].desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Result size comparison */}
        {pageState === "done" && compressedFiles.length > 0 && (
          <div
            className="p-5 border rounded-lg"
            style={{
              border: `1px solid var(--border-solid)`,
              borderRadius: "var(--radius-card)",
              background: "var(--surface)",
            }}
          >
            <p className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
              Hasil kompresi {compressedFiles.length > 1 && `(${compressedFiles.length} file)`}
            </p>
            <div className="flex items-center gap-8 flex-wrap">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
                  Sebelum
                </p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                  {formatBytes(originalSize)}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>
                  Sesudah
                </p>
                <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                  {formatBytes(resultSize)}
                </p>
              </div>
              {savings > 0 && (
                <div
                  className="px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "var(--accent-muted)",
                    color: "var(--accent-muted-text)",
                    borderRadius: "var(--radius-badge)",
                  }}
                >
                  Hemat {savings}%
                </div>
              )}
            </div>
            {savings === 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                File ini sudah cukup teroptimasi. Kompresi lebih lanjut tidak signifikan.
              </p>
            )}
          </div>
        )}

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
              Mengompres file {currentFileIndex + 1} dari {files.length}... {progress}%
            </p>
          </div>
        )}

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

        <div className="flex items-center gap-3 flex-wrap">
          {pageState !== "done" ? (
            <button
              type="button"
              id="compress-btn"
              onClick={handleCompress}
              disabled={!canCompress}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (canCompress)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent-hover)";
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
              {pageState === "processing" ? (
                <>
                  <SpinnerGap size={15} className="animate-spin" />
                  Mengompres...
                </>
              ) : (
                "Kompres PDF"
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
                    {compressedFiles.length > 1 ? "-compressed-files.zip" : "-compressed.pdf"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton 
                  onDownload={handleDownload} 
                  label={compressedFiles.length > 1 ? "Unduh ZIP Hasil" : "Unduh PDF Hasil"} 
                />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    setCompressedFiles([]);
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
