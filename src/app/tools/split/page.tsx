"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle, Minus, Plus } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "processing" | "done" | "error";

/* ────────────────────────────────────────────────────────
   PageThumbnail Component (Lazy Loading via IntersectionObserver)
──────────────────────────────────────────────────────── */
interface PageThumbnailProps {
  pageIndex: number;
  pdf: any; // PDFDocumentProxy from pdf.js
}

function PageThumbnail({ pageIndex, pdf }: PageThumbnailProps) {
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
  }, [pdf, pageIndex]);

  const renderThumbnail = async () => {
    try {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 0.5 }); // Sharp preview
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        setThumbUrl(canvas.toDataURL("image/jpeg", 0.85));
      }
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
   Main Split Page Component
──────────────────────────────────────────────────────── */
export default function SplitPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [pageCountLoaded, setPageCountLoaded] = useState(false);
  const [splitRange, setSplitRange] = useState({ from: 1, to: 1 });
  const [resultBytes, setResultBytes] = useState<Uint8Array[]>([]);
  const [progress, setProgress] = useState(0);

  usePreventUnload(files.length > 0);

  // PDF.js rendering documents
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
  
  // Interactive click-to-select range states
  const [clickStep, setClickStep] = useState<"from" | "to">("from");

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setPageState("idle");
    setResultBytes([]);
    setPageCountLoaded(false);
    setPdfJsDoc(null);
    setClickStep("from");

    if (newFiles.length > 0) {
      try {
        const buf = await newFiles[0].file.arrayBuffer();
        const doc = await PDFDocument.load(buf);
        const count = doc.getPageCount();
        setTotalPages(count);
        setSplitRange({ from: 1, to: count });
        setPageCountLoaded(true);

        // Load PDFJS doc for preview in background
        loadPdfJsDoc(buf);
      } catch {
        setErrorMsg("Tidak dapat membaca file PDF. Pastikan file tidak rusak.");
        setPageState("error");
      }
    }
  }, []);

  const loadPdfJsDoc = async (buf: ArrayBuffer) => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      // Slice to prevent detaching original buffer in main thread
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setPdfJsDoc(pdf);
    } catch (err) {
      console.warn("Gagal memuat modul PDF.js:", err);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (clickStep === "from") {
      setSplitRange({ from: pageNumber, to: pageNumber });
      setClickStep("to");
    } else {
      if (pageNumber < splitRange.from) {
        setSplitRange({ from: pageNumber, to: splitRange.from });
      } else {
        setSplitRange((prev) => ({ ...prev, to: pageNumber }));
      }
      setClickStep("from");
    }
  };

  const handleSplit = useCallback(async () => {
    if (!files[0]) return;
    setPageState("processing");
    setErrorMsg("");

    try {
      const buf = await files[0].file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf);

      const results: Uint8Array[] = [];
      const { from, to } = splitRange;
      const totalToSplit = to - from + 1;

      for (let i = from - 1; i <= to - 1; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(srcDoc, [i]);
        newDoc.addPage(page);
        const raw = await newDoc.save();
        const arr = new Uint8Array(raw.buffer.slice(0)) as Uint8Array<ArrayBuffer>;
        results.push(arr);

        setProgress(Math.round(((i - (from - 1) + 1) / totalToSplit) * 100));
      }

      setResultBytes(results as Uint8Array<ArrayBuffer>[]);
      setPageState("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memisah PDF. Pastikan file adalah PDF yang valid.");
      setPageState("error");
    }
  }, [files, splitRange]);

  const handleDownloadAll = useCallback(async () => {
    if (resultBytes.length === 0) return;

    if (resultBytes.length === 1) {
      const b = resultBytes[0];
      await streamDownload(b, `halaman-${splitRange.from}.pdf`);
      return;
    }

    for (let i = 0; i < resultBytes.length; i++) {
      const b = resultBytes[i];
      await streamDownload(b, `halaman-${splitRange.from + i}.pdf`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }, [resultBytes, splitRange]);

  const canSplit = files.length > 0 && pageCountLoaded && pageState === "idle";
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
      toolName="Pisahkan PDF"
      toolHref="/tools/split"
      description="Ambil halaman tertentu dari file PDF dan simpan sebagai file terpisah."
    >
      <div className="space-y-6">
        <DropZone
          accept=".pdf"
          multiple={false}
          files={files}
          onFilesChange={handleFilesChange}
          state={dropState}
        />

        {/* Page range selector */}
        {pageCountLoaded && pageState === "idle" && (
          <div className="space-y-6">
            {/* Input range picker */}
            <div
              className="p-5 border rounded-lg"
              style={{
                border: `1px solid var(--border-solid)`,
                borderRadius: "var(--radius-card)",
                background: "var(--surface)",
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Rentang Halaman (Input manual atau Klik Grid di bawah)
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                Dokumen ini memiliki <strong>{totalPages} halaman</strong>. Pilih rentang halaman yang ingin dipisahkan.
              </p>

              <div className="flex items-center gap-6 flex-wrap">
                {/* From */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    Dari halaman
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Kurangi halaman awal"
                      onClick={() =>
                        setSplitRange((r) => ({
                          ...r,
                          from: Math.max(1, r.from - 1),
                        }))
                      }
                      className="w-7 h-7 flex items-center justify-center border rounded transition-colors duration-150 bg-white"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <Minus size={12} weight="bold" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-semibold tabular-nums"
                      style={{ color: "var(--foreground)" }}
                    >
                      {splitRange.from}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah halaman awal"
                      onClick={() =>
                        setSplitRange((r) => ({
                          ...r,
                          from: Math.min(r.to, r.from + 1),
                        }))
                      }
                      className="w-7 h-7 flex items-center justify-center border rounded transition-colors duration-150 bg-white"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <Plus size={12} weight="bold" />
                    </button>
                  </div>
                </div>

                {/* To */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                    Sampai halaman
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Kurangi halaman akhir"
                      onClick={() =>
                        setSplitRange((r) => ({
                          ...r,
                          to: Math.max(r.from, r.to - 1),
                        }))
                      }
                      className="w-7 h-7 flex items-center justify-center border rounded transition-colors duration-150 bg-white"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <Minus size={12} weight="bold" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-semibold tabular-nums"
                      style={{ color: "var(--foreground)" }}
                    >
                      {splitRange.to}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah halaman akhir"
                      onClick={() =>
                        setSplitRange((r) => ({
                          ...r,
                          to: Math.min(totalPages, r.to + 1),
                        }))
                      }
                      className="w-7 h-7 flex items-center justify-center border rounded transition-colors duration-150 bg-white"
                      style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    >
                      <Plus size={12} weight="bold" />
                    </button>
                  </div>
                </div>

                <div
                  className="text-xs px-3 py-1.5 font-semibold"
                  style={{
                    background: "var(--accent-muted)",
                    color: "var(--accent)",
                    borderRadius: "var(--radius-badge)",
                  }}
                >
                  {splitRange.to - splitRange.from + 1} halaman dipilih
                </div>
              </div>
            </div>

            {/* Interactive Grid Selection */}
            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Pilih Halaman dari Grid Visual
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {clickStep === "from"
                    ? "👉 Klik halaman untuk menentukan AWAL rentang."
                    : "👉 Klik halaman untuk menentukan AKHIR rentang."}
                </p>
              </div>

              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                role="list"
                aria-label="Grid visual halaman PDF"
              >
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNumber = i + 1;
                  const isSelected = pageNumber >= splitRange.from && pageNumber <= splitRange.to;
                  return (
                    <div
                      key={`page-split-${pageNumber}`}
                      onClick={() => handlePageClick(pageNumber)}
                      className="group flex flex-col p-3 border bg-white relative transition-all duration-150 hover:shadow-sm cursor-pointer select-none"
                      style={{
                        border: isSelected
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border-solid)",
                        borderRadius: "var(--radius-card)",
                        opacity: isSelected ? 1 : 0.55,
                        transform: isSelected ? "scale(1.01)" : "none",
                        boxShadow: isSelected ? "0 4px 12px rgba(13, 148, 136, 0.08)" : undefined,
                      }}
                    >
                      {/* Page Preview Thumbnail */}
                      <div
                        className="w-full aspect-[3/4] bg-[#fafafa] border flex items-center justify-center overflow-hidden relative select-none pointer-events-none"
                        style={{
                          borderColor: "var(--border-solid)",
                          borderRadius: "var(--radius-badge)",
                        }}
                      >
                        <PageThumbnail pageIndex={i} pdf={pdfJsDoc} />

                        {/* Page Number Badge */}
                        <span
                          className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full bg-white border transition-colors"
                          style={{
                            borderColor: isSelected ? "var(--accent)" : "var(--border-solid)",
                            color: isSelected ? "var(--accent)" : "var(--foreground)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          {pageNumber}
                        </span>

                        {/* Check Overlay on hover/selection */}
                        <div
                          className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{
                            opacity: isSelected ? 0.05 : 0,
                          }}
                        />
                      </div>

                      {/* Footer Page Number Text */}
                      <div className="mt-2 text-center">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: isSelected ? "var(--accent)" : "var(--foreground)" }}
                        >
                          {isSelected ? "Dipilih" : `Halaman ${pageNumber}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
              Memisahkan halaman... {progress}%
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
              id="split-btn"
              onClick={handleSplit}
              disabled={!canSplit}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
                borderRadius: "var(--radius-btn)",
              }}
              onMouseEnter={(e) => {
                if (canSplit)
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
                  Memisahkan...
                </>
              ) : (
                "Pisahkan PDF"
              )}
            </button>
          ) : (
            <>
              <DownloadButton
                onDownload={handleDownloadAll}
                label={`Unduh ${resultBytes.length} File`}
              />
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setPageState("idle");
                  setResultBytes([]);
                  setPageCountLoaded(false);
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
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
