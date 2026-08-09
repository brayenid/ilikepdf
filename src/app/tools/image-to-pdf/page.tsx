"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle, Trash, ArrowUp, ArrowDown, Plus } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type PageSize = "fit" | "a4" | "letter";
type Orientation = "portrait" | "landscape";
type MarginSize = "none" | "small" | "large";

interface ImageItem {
  id: string;
  name: string;
  url: string; // Blob URL for preview
  file: File;
}

/* ────────────────────────────────────────────────────────
   PagePositionInput Component for Quick Reordering
──────────────────────────────────────────────────────── */
interface PagePositionInputProps {
  currentIndex: number;
  maxIndex: number;
  onMove: (targetIndex: number) => void;
  onActiveChange: (active: boolean) => void;
}

function PagePositionInput({ currentIndex, maxIndex, onMove, onActiveChange }: PagePositionInputProps) {
  const [value, setValue] = useState((currentIndex + 1).toString());

  useEffect(() => {
    setValue((currentIndex + 1).toString());
  }, [currentIndex]);

  const handleBlurOrEnter = () => {
    const val = parseInt(value, 10);
    if (isNaN(val) || val < 1 || val > maxIndex) {
      setValue((currentIndex + 1).toString());
      onActiveChange(false);
      return;
    }
    if (val - 1 !== currentIndex) {
      onMove(val - 1);
    }
    onActiveChange(false);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      onFocus={() => onActiveChange(true)}
      onBlur={handleBlurOrEnter}
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          onActiveChange(false);
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      title="Ubah posisi halaman (tekan Enter)"
      className="w-8 h-8 text-center text-xs font-semibold border rounded-full bg-white transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm cursor-text"
      style={{
        borderColor: "var(--border-solid)",
        color: "var(--foreground)",
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────
   Main Image to PDF Page Component
──────────────────────────────────────────────────────── */
export default function ImageToPdfPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBytes, setResultBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [progress, setProgress] = useState(0);
  const [isInputActive, setIsInputActive] = useState(false);
  const [outputName, setOutputName] = useState("");

  // Layout options
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginSize>("none");

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const insertFileInputRef = useRef<HTMLInputElement>(null);

  usePreventUnload(imageItems.length > 0);

  // Release blob URLs on unmount
  useEffect(() => {
    return () => {
      imageItems.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setPageState("loading");
    setErrorMsg("");
    setResultBytes(null);

    // Revoke old blob URLs
    imageItems.forEach((item) => URL.revokeObjectURL(item.url));

    if (newFiles.length === 0) {
      setImageItems([]);
      setOutputName("");
      setPageState("idle");
      return;
    }

    try {
      const items: ImageItem[] = newFiles.map((f) => ({
        id: `img-${Date.now()}-${Math.random()}`,
        name: f.file.name,
        url: URL.createObjectURL(f.file),
        file: f.file,
      }));

      setImageItems(items);
      setOutputName(newFiles[0].file.name.replace(/\.[^/.]+$/, ""));
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat berkas gambar.");
      setPageState("error");
    }
  }, [imageItems]);

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= imageItems.length || fromIndex === toIndex) return;
    setImageItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  };

  const moveUp = (index: number) => {
    movePage(index, index - 1);
  };

  const moveDown = (index: number) => {
    movePage(index, index + 1);
  };

  const removeImage = (index: number) => {
    const removed = imageItems[index];
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    setImageItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setFiles([]);
        setPageState("idle");
        setOutputName("");
      }
      return updated;
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setImageItems((prev) => {
      const next = [...prev];
      const temp = next[draggedIndex];
      next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, temp);
      return next;
    });
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Insert additional images
  const handleInsertFileClick = () => {
    insertFileInputRef.current?.click();
  };

  const handleInsertFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    try {
      const newItems: ImageItem[] = [];
      const newDroppedFiles: DroppedFile[] = [...files];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        if (file.type.startsWith("image/")) {
          newItems.push({
            id: `img-${Date.now()}-${Math.random()}`,
            name: file.name,
            url: URL.createObjectURL(file),
            file: file,
          });
          newDroppedFiles.push({
            id: `inserted-${Date.now()}-${i}`,
            file: file,
          });
        }
      }

      setFiles(newDroppedFiles);
      setImageItems((prev) => [...prev, ...newItems]);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menyisipkan gambar.");
    }
  };

  const handleGeneratePdf = useCallback(async () => {
    if (imageItems.length === 0) return;
    setPageState("processing");
    setProgress(0);
    setErrorMsg("");

    try {
      const pdfDoc = await PDFDocument.create();

      // Page size constants
      const PAGE_SIZES = {
        a4: { width: 595.27, height: 841.89 },     // A4 points
        letter: { width: 612.0, height: 792.0 },  // Letter points
      };

      for (let i = 0; i < imageItems.length; i++) {
        const item = imageItems[i];
        const imgBuffer = await item.file.arrayBuffer();

        let embeddedImg;
        if (item.file.type === "image/png" || item.name.toLowerCase().endsWith(".png")) {
          embeddedImg = await pdfDoc.embedPng(imgBuffer);
        } else {
          embeddedImg = await pdfDoc.embedJpg(imgBuffer);
        }

        const { width: imgW, height: imgH } = embeddedImg.scale(1.0);

        let pageWidth = imgW;
        let pageHeight = imgH;
        let marginVal = 0;

        if (margin === "small") marginVal = 12; // 12 points (~5mm)
        if (margin === "large") marginVal = 28; // 28 points (~10mm)

        if (pageSize !== "fit") {
          const dims = PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES];
          if (orientation === "portrait") {
            pageWidth = dims.width;
            pageHeight = dims.height;
          } else {
            pageWidth = dims.height;
            pageHeight = dims.width;
          }
        }

        // Add page
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate size to draw
        const usableWidth = pageWidth - marginVal * 2;
        const usableHeight = pageHeight - marginVal * 2;

        let drawW = imgW;
        let drawH = imgH;

        if (pageSize !== "fit" || marginVal > 0) {
          const scale = Math.min(usableWidth / imgW, usableHeight / imgH, 1.0);
          drawW = imgW * scale;
          drawH = imgH * scale;
        }

        const drawX = marginVal + (usableWidth - drawW) / 2;
        const drawY = marginVal + (usableHeight - drawH) / 2;

        page.drawImage(embeddedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });

        setProgress(Math.round(((i + 1) / imageItems.length) * 100));
      }

      const raw = await pdfDoc.save();
      const bytes = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) as Uint8Array<ArrayBuffer>;
      setResultBytes(bytes);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengonversi gambar ke PDF.");
      setPageState("error");
    }
  }, [imageItems, pageSize, orientation, margin]);

  const handleDownload = useCallback(async () => {
    if (!resultBytes) return;
    const base = outputName.trim() || "output";
    const fileName = `kindalikepdf-${base}-images.pdf`;
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
      toolName="Gambar ke PDF"
      toolHref="/tools/image-to-pdf"
      description="Konversi kumpulan file gambar PNG, JPG, atau JPEG menjadi satu dokumen PDF secara cepat dan lokal."
    >
      <div className="space-y-6">
        <DropZone
          accept="image/png,image/jpeg,image/jpg"
          multiple={true}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Hidden File Input for Insertion */}
        <input
          ref={insertFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          multiple
          className="hidden"
          onChange={handleInsertFileChange}
        />

        {/* Loading */}
        {pageState === "loading" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Membaca file gambar...
          </p>
        )}

        {/* Processing State with progress bar */}
        {pageState === "processing" && (
          <div className="p-4 border rounded-lg bg-[#fafafa] mb-4">
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
              Mengonversi halaman... {progress}%
            </p>
          </div>
        )}

        {/* Configurations & Grid */}
        {((pageState === "ready" || pageState === "processing")) && imageItems.length > 0 && (
          <div>
            {/* Sticky controls bar */}
            <div
              className="sticky top-[64px] z-20 flex items-center justify-between py-3 mb-5 flex-wrap gap-3 backdrop-blur-md bg-white/80 border-b -mx-6 px-6 transition-all"
              style={{ borderColor: "var(--border-solid)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {imageItems.length} gambar terpilih
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Seret dan taruh untuk menyusun urutan halaman PDF Anda secara instan.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Insert Button */}
                <button
                  type="button"
                  onClick={handleInsertFileClick}
                  className="px-3 py-1.5 text-xs font-semibold text-white transition-all duration-150 flex items-center gap-1.5"
                  style={{
                    background: "var(--accent)",
                    borderRadius: "var(--radius-btn)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
                  }}
                >
                  <Plus size={13} weight="bold" />
                  Tambah Gambar
                </button>

                {/* Configurations */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1">
                    <span style={{ color: "var(--muted)" }}>Ukuran:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as PageSize)}
                      className="px-2 py-1 border rounded bg-white text-[var(--foreground)] outline-none"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <option value="fit">Sesuai Gambar</option>
                      <option value="a4">Kertas A4</option>
                      <option value="letter">Kertas Letter</option>
                    </select>
                  </div>

                  {pageSize !== "fit" && (
                    <div className="flex items-center gap-1">
                      <span style={{ color: "var(--muted)" }}>Orientasi:</span>
                      <select
                        value={orientation}
                        onChange={(e) => setOrientation(e.target.value as Orientation)}
                        className="px-2 py-1 border rounded bg-white text-[var(--foreground)] outline-none"
                        style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                      >
                        <option value="portrait">Tegak (Portrait)</option>
                        <option value="landscape">Mendatar (Landscape)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span style={{ color: "var(--muted)" }}>Margin:</span>
                    <select
                      value={margin}
                      onChange={(e) => setMargin(e.target.value as MarginSize)}
                      className="px-2 py-1 border rounded bg-white text-[var(--foreground)] outline-none"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <option value="none">Tanpa Margin</option>
                      <option value="small">Kecil</option>
                      <option value="large">Lebar</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of Images */}
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              role="list"
              aria-label="Grid Gambar"
            >
              {imageItems.map((item, index) => {
                const isDraggingThis = draggedIndex === index;
                return (
                  <div
                    key={item.id}
                    draggable={!isInputActive}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className="group flex flex-col p-3 border bg-white relative transition-all duration-150 hover:shadow-sm cursor-grab active:cursor-grabbing select-none"
                    style={{
                      border: isDraggingThis
                        ? "1.5px dashed var(--accent)"
                        : "1px solid var(--border-solid)",
                      borderRadius: "var(--radius-card)",
                      opacity: isDraggingThis ? 0.3 : 1,
                      transform: isDraggingThis ? "scale(0.97)" : "none",
                    }}
                  >
                    {/* Image Area */}
                    <div
                      className="w-full aspect-[3/4] bg-[#fafafa] border flex items-center justify-center overflow-hidden relative select-none pointer-events-none"
                      style={{
                        borderColor: "var(--border-solid)",
                        borderRadius: "var(--radius-badge)",
                      }}
                    >
                      <img
                        src={item.url}
                        alt={`Preview ${item.name}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />

                      {/* Position Input */}
                      <div
                        className="absolute top-2 left-2 z-10 pointer-events-auto"
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                      >
                        <PagePositionInput
                          currentIndex={index}
                          maxIndex={imageItems.length}
                          onMove={(target) => movePage(index, target)}
                          onActiveChange={setIsInputActive}
                        />
                      </div>

                      {/* Hover Controls */}
                      {!isDraggingThis && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 pointer-events-auto">
                          <button
                            type="button"
                            aria-label={`Geser ${item.name} ke kiri`}
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveUp(index);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white text-gray-700 shadow hover:text-teal-600 disabled:opacity-50 disabled:hover:text-gray-700"
                            style={{ borderRadius: "var(--radius-btn)" }}
                          >
                            <ArrowUp size={14} weight="bold" className="-rotate-90" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Geser ${item.name} ke kanan`}
                            disabled={index === imageItems.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveDown(index);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white text-gray-700 shadow hover:text-teal-600 disabled:opacity-50 disabled:hover:text-gray-700"
                            style={{ borderRadius: "var(--radius-btn)" }}
                          >
                            <ArrowDown size={14} weight="bold" className="-rotate-90" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${item.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white text-red-600 shadow hover:bg-red-50"
                            style={{ borderRadius: "var(--radius-btn)" }}
                          >
                            <Trash size={14} weight="regular" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer Name */}
                    <div className="mt-2 text-center pointer-events-none">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                );
              })}
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
              onClick={handleGeneratePdf}
              disabled={pageState !== "ready" || imageItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (pageState === "ready" && imageItems.length > 0)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              }}
            >
              {pageState === "processing" ? (
                <>
                  <SpinnerGap size={15} className="animate-spin" />
                  Mengonversi...
                </>
              ) : (
                "Simpan & Buat PDF"
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
                    -images.pdf
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label="Unduh PDF Hasil" />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    setImageItems([]);
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
