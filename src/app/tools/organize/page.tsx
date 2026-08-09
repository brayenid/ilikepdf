"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle, Trash, ArrowUp, ArrowDown, List, SquaresFour, DotsSixVertical, Plus, ArrowClockwise } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PageItem {
  id: string;
  label: string;
  pageIndex: number; // original index in the source PDF
  sourceDocId: string; // references a source document in the state
  rotation?: number; // 0, 90, 180, 270 degrees
}

interface SourceDoc {
  id: string;
  name: string; // file name
  buffer: ArrayBuffer;
  pdfJsDoc: any; // PDFJS document instance for lazy rendering
}

/* ────────────────────────────────────────────────────────
   PageThumbnail Component (Lazy Loading via IntersectionObserver)
──────────────────────────────────────────────────────── */
interface PageThumbnailProps {
  pageIndex: number;
  pdf: any; // PDFDocumentProxy from pdf.js
  scale: number;
}

function PageThumbnail({ pageIndex, pdf, scale }: PageThumbnailProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!pdf) return;

    renderedRef.current = false;
    setThumbUrl(null);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !renderedRef.current) {
          renderedRef.current = true;
          observer.disconnect();
          renderThumbnail();
        }
      },
      { rootMargin: "250px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pdf, pageIndex, scale]);

  const renderThumbnail = async () => {
    try {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale }); // Custom resolution scale
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        setThumbUrl(canvas.toDataURL("image/jpeg", 0.85));
      }
      // Clean up canvas memory immediately
      canvas.width = 0;
      canvas.height = 0;
    } catch (e) {
      console.warn("Gagal me-render thumbnail halaman:", e);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-[#fafafa]"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={`Thumbnail Halaman ${pageIndex + 1}`}
          className="w-full h-full object-cover select-none"
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5 select-none">
          <SpinnerGap size={14} className="animate-spin text-[#9ca3af]" />
          <span className="text-[9px] text-[#9ca3af]">Loading</span>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Page Position Input Component for Quick Reordering
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
   Main Organize Page Component
──────────────────────────────────────────────────────── */
export default function OrganizePage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [pageItems, setPageItems] = useState<PageItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBytes, setResultBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isInputActive, setIsInputActive] = useState(false);
  const [outputName, setOutputName] = useState("");
  const [previewScale, setPreviewScale] = useState<number>(0.5);

  // States for inserting pages modal
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number>(1);
  const [insertItemsPreview, setInsertItemsPreview] = useState<PageItem[]>([]);
  const [insertSourceDoc, setInsertSourceDoc] = useState<SourceDoc | null>(null);

  usePreventUnload(files.length > 0);

  // Multi-document state
  const [sourceDocs, setSourceDocs] = useState<SourceDoc[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const dragYRef = useRef<number | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Auto-scroll when dragging near viewport edges
  useEffect(() => {
    if (draggedIndex === null) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      dragYRef.current = null;
      return;
    }

    const handleWindowDragOver = (e: DragEvent) => {
      dragYRef.current = e.clientY;
    };

    window.addEventListener("dragover", handleWindowDragOver);

    const checkScroll = () => {
      if (dragYRef.current !== null) {
        const y = dragYRef.current;
        const threshold = 120; // px from top/bottom of viewport
        const maxSpeed = 20; // px per frame
        const height = window.innerHeight;

        let speed = 0;
        if (y < threshold) {
          // Scroll up: speed is negative
          const ratio = (threshold - y) / threshold;
          speed = -maxSpeed * Math.min(1, Math.max(0, ratio));
        } else if (y > height - threshold) {
          // Scroll down: speed is positive
          const ratio = (y - (height - threshold)) / threshold;
          speed = maxSpeed * Math.min(1, Math.max(0, ratio));
        }

        if (speed !== 0) {
          window.scrollBy(0, speed);
        }
      }
      animationFrameId.current = requestAnimationFrame(checkScroll);
    };

    animationFrameId.current = requestAnimationFrame(checkScroll);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [draggedIndex]);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setPageState("loading");
    setPageItems([]);
    setResultBytes(null);
    setErrorMsg("");
    setSourceDocs([]);

    if (newFiles.length === 0) {
      setPageState("idle");
      setOutputName("");
      return;
    }

    try {
      const file = newFiles[0].file;
      setOutputName(file.name.replace(/\.pdf$/i, ""));
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const count = doc.getPageCount();

      const docId = `doc-${Date.now()}`;
      const newSourceDoc: SourceDoc = {
        id: docId,
        name: file.name,
        buffer: buf,
        pdfJsDoc: null,
      };

      const items: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: `page-${docId}-${i}-${Date.now()}`,
        label: `Hal ${i + 1} (${file.name})`,
        pageIndex: i,
        sourceDocId: docId,
      }));

      setSourceDocs([newSourceDoc]);
      setPageItems(items);
      setPageState("ready");

      // Load PDF.js document in background
      loadPdfJsDoc(buf, docId);
    } catch {
      setErrorMsg("Tidak dapat membaca file PDF.");
      setPageState("error");
    }
  }, []);

  const loadPdfJsDoc = async (buf: ArrayBuffer, docId: string) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      // Slice the ArrayBuffer to pass a copy, preventing PDF.js from detaching the original buffer
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setSourceDocs((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, pdfJsDoc: pdf } : d))
      );
      setInsertSourceDoc((prev) => (prev && prev.id === docId ? { ...prev, pdfJsDoc: pdf } : prev));
    } catch (err) {
      console.warn("Gagal memuat modul PDF.js:", err);
    }
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pageItems.length || fromIndex === toIndex) return;
    setPageItems((prev) => {
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

  const removePage = (index: number) => {
    setPageItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setPageItems((prev) => {
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

  // Insert PDF or Image
  const handleInsertFileClick = () => {
    setInsertTargetIndex(pageItems.length + 1);
    setInsertModalOpen(true);
  };

  const handleInsertFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let buf: ArrayBuffer;
      let isImage = false;

      if (file.type.startsWith("image/")) {
        isImage = true;
        // Convert Image (PNG/JPEG) to a single-page PDF document buffer
        const imgBuf = await file.arrayBuffer();
        const imagePdf = await PDFDocument.create();
        let embeddedImg;
        if (file.type === "image/png") {
          embeddedImg = await imagePdf.embedPng(imgBuf);
        } else {
          embeddedImg = await imagePdf.embedJpg(imgBuf);
        }

        const { width, height } = embeddedImg.scale(1.0);
        const page = imagePdf.addPage([width, height]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width, height });
        const savedBytes = await imagePdf.save();
        buf = savedBytes.buffer.slice(savedBytes.byteOffset, savedBytes.byteOffset + savedBytes.byteLength) as ArrayBuffer;
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        buf = await file.arrayBuffer() as ArrayBuffer;
      } else {
        setErrorMsg("Format file tidak didukung. Harap pilih PDF atau Gambar.");
        return;
      }

      const doc = await PDFDocument.load(buf);
      const count = doc.getPageCount();

      const docId = `doc-${Date.now()}`;
      const newSourceDoc: SourceDoc = {
        id: docId,
        name: file.name,
        buffer: buf,
        pdfJsDoc: null,
      };

      const newItems: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: `page-${docId}-${i}-${Date.now()}`,
        label: isImage ? `Gambar (${file.name})` : `Hal ${i + 1} (${file.name})`,
        pageIndex: i,
        sourceDocId: docId,
      }));

      // Add to sourceDocs right away so previews render correctly
      setSourceDocs((prev) => [...prev, newSourceDoc]);
      setInsertSourceDoc(newSourceDoc);
      setInsertItemsPreview(newItems);
      setInsertTargetIndex(pageItems.length + 1); // Default to inserting at the end
      setInsertModalOpen(true);

      // Load PDF.js document in background for lazy thumbnails
      loadPdfJsDoc(buf, docId);

      // Clear input
      e.target.value = "";
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menyisipkan berkas.");
    }
  };

  const handleConfirmInsert = () => {
    if (insertItemsPreview.length === 0) return;

    // insertTargetIndex is 1-based, so position index is insertTargetIndex - 1.
    const targetIdx = Math.max(0, Math.min(pageItems.length, insertTargetIndex - 1));

    setPageItems((prev) => {
      const next = [...prev];
      next.splice(targetIdx, 0, ...insertItemsPreview);
      return next;
    });

    setInsertModalOpen(false);
    setInsertItemsPreview([]);
    setInsertSourceDoc(null);
  };

  const handleCancelInsert = () => {
    if (insertSourceDoc) {
      setSourceDocs((prev) => prev.filter((d) => d.id !== insertSourceDoc.id));
    }
    setInsertModalOpen(false);
    setInsertItemsPreview([]);
    setInsertSourceDoc(null);
  };

  const rotatePage = (index: number) => {
    setPageItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, rotation: ((item.rotation || 0) + 90) % 360 } : item
      )
    );
  };

  const handleSave = useCallback(async () => {
    if (sourceDocs.length === 0 || pageItems.length === 0) return;
    setPageState("processing");
    setProgress(0);
    setErrorMsg("");

    try {
      const newDoc = await PDFDocument.create();
      const loadedDocs: Record<string, PDFDocument> = {};

      // Copy pages according to the configured order in pageItems
      for (let i = 0; i < pageItems.length; i++) {
        const item = pageItems[i];
        
        // Cache loaded PDFDocument instances for speed
        if (!loadedDocs[item.sourceDocId]) {
          const srcDoc = sourceDocs.find((d) => d.id === item.sourceDocId);
          if (srcDoc) {
            loadedDocs[item.sourceDocId] = await PDFDocument.load(srcDoc.buffer);
          }
        }

        const docInstance = loadedDocs[item.sourceDocId];
        if (docInstance) {
          const [page] = await newDoc.copyPages(docInstance, [item.pageIndex]);
          if (item.rotation) {
            const currentRot = page.getRotation().angle;
            page.setRotation(degrees((currentRot + item.rotation) % 360));
          }
          newDoc.addPage(page);
        }

        setProgress(Math.round(((i + 1) / pageItems.length) * 100));
      }

      const raw = await newDoc.save();
      const bytes = new Uint8Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)) as Uint8Array<ArrayBuffer>;
      setResultBytes(bytes);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menyusun ulang berkas PDF.");
      setPageState("error");
    }
  }, [sourceDocs, pageItems]);

  const handleDownload = useCallback(async () => {
    if (!resultBytes) return;
    const base = outputName.trim() || "output";
    const fileName = `kindalikepdf-${base}-organized.pdf`;
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
      toolName="Kelola Halaman"
      toolHref="/tools/organize"
      description="Susun ulang, hapus, selipkan halaman gambar atau PDF lain, lalu simpan berkas baru."
    >
      <div className="space-y-6">
        <DropZone
          accept=".pdf"
          multiple={false}
          files={files}
          onFilesChange={(f) => {
            handleFilesChange(f);
          }}
          state={dropState}
        />

        {/* Warning Box for Large Files */}
        {files.length > 0 && (pageItems.length > 80 || (files[0] && files[0].file.size > 30 * 1024 * 1024)) && (
          <div
            className="flex items-start gap-2.5 p-3.5 text-sm"
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "var(--radius-card)",
              color: "#b45309",
            }}
            role="alert"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[#d97706]" />
            <div>
              <p className="font-semibold text-[#92400e]">Performa Optimal</p>
              <p className="text-xs mt-0.5 text-[#92400e]/90">
                PDF ini cukup besar ({pageItems.length} halaman, {formatBytes(files[0].file.size)}). Untuk kenyamanan mengedit tanpa lambat/lag, kami menyarankan untuk mengubah **Resolusi Preview** menjadi **Rendah (Cepat)**.
              </p>
            </div>
          </div>
        )}



        {/* Loading */}
        {pageState === "loading" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Membaca halaman PDF...
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
              Menyusun ulang halaman... {progress}%
            </p>
          </div>
        )}

        {/* Page list */}
        {((pageState === "ready" || pageState === "processing")) && pageItems.length > 0 && (
          <div>
            <div
              className="sticky top-[64px] z-20 flex items-center justify-between py-3 mb-5 flex-wrap gap-3 backdrop-blur-md bg-white/80 border-b -mx-6 px-6 transition-all"
              style={{ borderColor: "var(--border-solid)" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {pageItems.length} halaman tersisa
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Seret dan taruh (drag & drop) halaman untuk mengurutkan secara langsung.
                </p>
              </div>

              {/* Controls bar */}
              <div className="flex items-center gap-3">
                {/* Insert Page Button */}
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
                  Sisipkan Halaman
                </button>

                {/* Resolution Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Resolusi Preview:</span>
                  <select
                    value={previewScale}
                    onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                    className="px-2 py-1 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    style={{
                      borderColor: "var(--border-solid)",
                      color: "var(--foreground)",
                      borderRadius: "var(--radius-btn)",
                    }}
                  >
                    <option value={0.2}>Rendah (Cepat)</option>
                    <option value={0.5}>Sedang</option>
                    <option value={0.8}>Tinggi</option>
                    <option value={1.2}>Sangat Tinggi (Tajam)</option>
                  </select>
                </div>

                {/* View Mode Segmented Controls */}
                <div
                  className="flex items-center p-1 border"
                  style={{
                    borderColor: "var(--border-solid)",
                    borderRadius: "var(--radius-btn)",
                    background: "var(--surface)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Tampilan Grid"
                    className="px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all duration-150"
                    style={{
                      borderRadius: "calc(var(--radius-btn) - 2px)",
                      background: viewMode === "grid" ? "#ffffff" : "transparent",
                      color: viewMode === "grid" ? "var(--accent)" : "var(--muted)",
                      boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    <SquaresFour size={14} weight={viewMode === "grid" ? "fill" : "regular"} />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="Tampilan List"
                    className="px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 transition-all duration-150"
                    style={{
                      borderRadius: "calc(var(--radius-btn) - 2px)",
                      background: viewMode === "list" ? "#ffffff" : "transparent",
                      color: viewMode === "list" ? "var(--accent)" : "var(--muted)",
                      boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    <List size={14} weight={viewMode === "list" ? "bold" : "regular"} />
                    List
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "list" ? (
              <ul
                className="space-y-2"
                role="list"
                aria-label="Daftar halaman PDF (List)"
              >
                {pageItems.map((item, index) => {
                  const isDraggingThis = draggedIndex === index;
                  const srcDoc = sourceDocs.find((d) => d.id === item.sourceDocId);
                  return (
                    <li
                      key={item.id}
                      draggable={!isInputActive}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex items-center gap-3 px-4 py-3 border bg-white transition-all duration-150 cursor-grab active:cursor-grabbing"
                      style={{
                        border: isDraggingThis
                          ? "1px dashed var(--accent)"
                          : "1px solid var(--border-solid)",
                        borderRadius: "var(--radius-card)",
                        opacity: isDraggingThis ? 0.4 : 1,
                        background: isDraggingThis ? "#fafafa" : "#ffffff",
                      }}
                    >
                      {/* Grab Handle Icon */}
                      <div className="text-gray-400 shrink-0">
                        <DotsSixVertical size={16} />
                      </div>

                      {/* Order number (Editable Position Input) */}
                      <div
                        className="shrink-0"
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                      >
                        <PagePositionInput
                          currentIndex={index}
                          maxIndex={pageItems.length}
                          onMove={(target) => movePage(index, target)}
                          onActiveChange={setIsInputActive}
                        />
                      </div>

                      {/* Thumbnail Preview */}
                      <div
                        className="w-12 h-16 bg-[#fafafa] border flex items-center justify-center overflow-hidden shrink-0 select-none"
                        style={{
                          borderColor: "var(--border-solid)",
                          borderRadius: "var(--radius-badge)",
                        }}
                      >
                        <div style={{ transform: `rotate(${item.rotation || 0}deg)`, transition: "transform 0.15s ease" }} className="w-full h-full flex items-center justify-center">
                          <PageThumbnail pageIndex={item.pageIndex} pdf={srcDoc?.pdfJsDoc} scale={previewScale} />
                        </div>
                      </div>

                      {/* Page label */}
                      <span
                        className="flex-1 text-sm font-medium truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {item.label}
                      </span>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Putar ${item.label}`}
                          onClick={() => rotatePage(index)}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--accent)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--muted)")
                          }
                        >
                          <ArrowClockwise size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Geser ${item.label} ke atas`}
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 disabled:opacity-30"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--foreground)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--muted)")
                          }
                        >
                          <ArrowUp size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Geser ${item.label} ke bawah`}
                          disabled={index === pageItems.length - 1}
                          onClick={() => moveDown(index)}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 disabled:opacity-30"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--foreground)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--muted)")
                          }
                        >
                          <ArrowDown size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${item.label}`}
                          onClick={() => removePage(index)}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#dc2626";
                            e.currentTarget.style.background = "#fef2f2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "var(--muted)";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <Trash size={14} weight="regular" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                role="list"
                aria-label="Grid halaman PDF"
              >
                {pageItems.map((item, index) => {
                  const isDraggingThis = draggedIndex === index;
                  const srcDoc = sourceDocs.find((d) => d.id === item.sourceDocId);
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
                        boxShadow: isDraggingThis ? "none" : undefined,
                      }}
                    >
                      {/* Thumbnail Preview Area */}
                      <div
                        className="w-full aspect-[3/4] bg-[#fafafa] border flex items-center justify-center overflow-hidden relative select-none pointer-events-none"
                        style={{
                          borderColor: "var(--border-solid)",
                          borderRadius: "var(--radius-badge)",
                        }}
                      >
                        <div style={{ transform: `rotate(${item.rotation || 0}deg)`, transition: "transform 0.15s ease" }} className="w-full h-full flex items-center justify-center">
                          <PageThumbnail pageIndex={item.pageIndex} pdf={srcDoc?.pdfJsDoc} scale={previewScale} />
                        </div>

                        {/* Badge Page Number (Editable Position Input) */}
                        <div
                          className="absolute top-2 left-2 z-10 pointer-events-auto"
                          draggable={false}
                          onDragStart={(e) => e.stopPropagation()}
                        >
                          <PagePositionInput
                            currentIndex={index}
                            maxIndex={pageItems.length}
                            onMove={(target) => movePage(index, target)}
                            onActiveChange={setIsInputActive}
                          />
                        </div>

                        {/* Action buttons (hidden during drag) */}
                        {!isDraggingThis && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 pointer-events-auto">
                            <button
                              type="button"
                              aria-label={`Putar ${item.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(index);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded bg-white text-gray-700 shadow hover:text-teal-600"
                              style={{ borderRadius: "var(--radius-btn)" }}
                            >
                              <ArrowClockwise size={14} weight="bold" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Geser ${item.label} ke kiri`}
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
                              aria-label={`Geser ${item.label} ke kanan`}
                              disabled={index === pageItems.length - 1}
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
                              aria-label={`Hapus ${item.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                removePage(index);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded bg-white text-red-600 shadow hover:bg-red-50"
                              style={{ borderRadius: "var(--radius-btn)" }}
                            >
                              <Trash size={14} weight="regular" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Name */}
                      <div className="mt-2 text-center pointer-events-none">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                          {item.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty pages warning */}
        {pageState === "ready" && pageItems.length === 0 && (
          <p className="text-sm" style={{ color: "#dc2626" }}>
            Semua halaman telah dihapus. Tambahkan kembali file untuk memulai.
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
              id="organize-save-btn"
              onClick={handleSave}
              disabled={pageState !== "ready" || pageItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (pageState === "ready" && pageItems.length > 0)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
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
                  Menyimpan...
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
                    -organized.pdf
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
                    setPageItems([]);
                    setSourceDocs([]);
                    setOutputName("");
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

      {/* Insertion Modal */}
      {insertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-lg border shadow-xl w-full max-w-lg overflow-hidden flex flex-col" style={{ borderColor: "var(--border-solid)" }}>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-solid)" }}>
              <h3 className="text-base font-semibold text-[#111111]">Sisipkan Halaman</h3>
              <button
                type="button"
                onClick={handleCancelInsert}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Previews or Upload Input */}
              {insertItemsPreview.length === 0 ? (
                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border-solid)" }}
                >
                  <Plus size={24} className="text-gray-400 mb-2" />
                  <p className="text-xs font-semibold text-[#111111]">Pilih File PDF atau Gambar</p>
                  <p className="text-[10px] text-gray-500 mt-1">Mendukung file .pdf, .png, .jpg, .jpeg</p>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleInsertFileChange}
                  />
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Berikut adalah halaman dari file/gambar yang Anda unggah:
                  </p>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1 border rounded bg-[#fafafa]" style={{ borderColor: "var(--border-solid)" }}>
                    {insertItemsPreview.map((item) => {
                      const doc = sourceDocs.find((d) => d.id === item.sourceDocId) || insertSourceDoc;
                      return (
                        <div key={item.id} className="border p-2 rounded bg-white flex flex-col items-center gap-1 shadow-sm" style={{ borderColor: "var(--border-solid)" }}>
                          <div className="w-14 h-20 bg-gray-50 border flex items-center justify-center overflow-hidden rounded relative pointer-events-none">
                            <PageThumbnail pageIndex={item.pageIndex} pdf={doc?.pdfJsDoc} scale={0.25} />
                          </div>
                          <span className="text-[9px] text-gray-500 truncate w-full text-center font-medium mt-1">
                            Hal {item.pageIndex + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Input Position */}
                  <div className="flex flex-col gap-1.5 pt-2">
                    <label htmlFor="insert-target-index" className="text-xs font-semibold text-gray-700">
                      Sisipkan mulai posisi nomor (halaman):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="insert-target-index"
                        type="number"
                        min={1}
                        max={pageItems.length + 1}
                        value={insertTargetIndex}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setInsertTargetIndex(Math.max(1, Math.min(pageItems.length + 1, val)));
                          }
                        }}
                        className="w-20 px-3 py-1.5 text-sm border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        style={{ borderColor: "var(--border-solid)" }}
                      />
                      <span className="text-xs text-gray-500">
                        (Batas: Halaman 1 s.d. {pageItems.length + 1}. Nilai {pageItems.length + 1} menyisipkan di bagian paling akhir)
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#fafafa] border-t flex justify-end gap-3" style={{ borderColor: "var(--border-solid)" }}>
              <button
                type="button"
                onClick={handleCancelInsert}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-all"
                style={{ borderRadius: "var(--radius-btn)" }}
              >
                Batal
              </button>
              {insertItemsPreview.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmInsert}
                  className="px-4 py-2 text-xs font-medium text-white transition-all"
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
                  Simpan & Sisipkan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
