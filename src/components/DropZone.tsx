"use client";

import { useCallback, useState } from "react";
import { UploadSimple, FileText, X, CheckCircle, ArrowUp, ArrowDown, DotsSixVertical } from "@phosphor-icons/react";

export type DropZoneState = "idle" | "dragging" | "loaded" | "processing" | "done" | "error";

interface DroppedFile {
  file: File;
  id: string;
}

interface DropZoneProps {
  accept?: string;
  multiple?: boolean;
  files: DroppedFile[];
  onFilesChange: (files: DroppedFile[]) => void;
  state: DropZoneState;
  maxFiles?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({
  accept = ".pdf",
  multiple = false,
  files,
  onFilesChange,
  state,
  maxFiles = 10,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Confirmation modal state
  const [confirmFile, setConfirmFile] = useState<DroppedFile | null>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const mapped: DroppedFile[] = newFiles.map((f) => ({
        file: f,
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      }));
      if (multiple) {
        onFilesChange([...files, ...mapped].slice(0, maxFiles));
      } else {
        onFilesChange([mapped[0]]);
      }
    },
    [files, multiple, maxFiles, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const handleRemoveClick = (fileItem: DroppedFile) => {
    setConfirmFile(fileItem);
  };

  const confirmRemove = () => {
    if (confirmFile) {
      onFilesChange(files.filter((f) => f.id !== confirmFile.id));
      setConfirmFile(null);
    }
  };

  const isDisabled = state === "processing" || state === "done";

  // Reordering handlers for multiple files
  const handleItemDragStart = (index: number) => {
    if (isDisabled) return;
    setDraggedIndex(index);
  };

  const handleItemDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex || isDisabled) return;
    const next = [...files];
    const temp = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, temp);
    onFilesChange(next);
    setDraggedIndex(targetIndex);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveUp = (index: number) => {
    if (index === 0 || isDisabled) return;
    const next = [...files];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onFilesChange(next);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1 || isDisabled) return;
    const next = [...files];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onFilesChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone area */}
      {(!files.length || multiple) && !isDisabled && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          aria-label="Area upload file"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              document.getElementById("dropzone-input")?.click();
            }
          }}
          onClick={() => document.getElementById("dropzone-input")?.click()}
          className="relative cursor-pointer transition-all duration-200 select-none"
          style={{
            border: isDragging
              ? `2px dashed var(--accent)`
              : `2px dashed var(--border-solid)`,
            borderRadius: "var(--radius-card)",
            background: isDragging ? "var(--accent-muted)" : "var(--surface)",
            padding: "3rem 2rem",
          }}
        >
          <input
            id="dropzone-input"
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200"
              style={{
                background: isDragging ? "var(--accent)" : "var(--border-solid)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <UploadSimple
                size={22}
                weight="regular"
                style={{ color: isDragging ? "#fff" : "var(--muted)" }}
              />
            </div>
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: isDragging ? "var(--accent)" : "var(--foreground)" }}
              >
                {isDragging ? "Lepas file di sini" : "Seret file ke sini"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                atau{" "}
                <span
                  className="underline underline-offset-2 cursor-pointer"
                  style={{ color: "var(--accent)" }}
                >
                  klik untuk memilih
                </span>
                {multiple && maxFiles > 1 && ` (maks. ${maxFiles} file)`}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                Format diterima: <span className="font-mono">{accept}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" role="list" aria-label="File yang dipilih">
          {files.map(({ file, id }, index) => {
            const isDraggingThis = draggedIndex === index;
            return (
              <li
                key={id}
                draggable={multiple && !isDisabled}
                onDragStart={() => handleItemDragStart(index)}
                onDragEnter={() => handleItemDragEnter(index)}
                onDragEnd={handleItemDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-4 py-3 border transition-all duration-150"
                style={{
                  border: isDraggingThis
                    ? "1px dashed var(--accent)"
                    : "1px solid var(--border-solid)",
                  borderRadius: "var(--radius-card)",
                  background: isDraggingThis ? "#fafafa" : "#ffffff",
                  opacity: isDraggingThis ? 0.4 : 1,
                  cursor: multiple && !isDisabled ? "grab" : "default",
                }}
              >
                {/* Drag Handle Icon for sorting (only shown in multi-file mode) */}
                {multiple && !isDisabled && (
                  <div className="text-gray-400 shrink-0 pointer-events-none select-none">
                    <DotsSixVertical size={16} />
                  </div>
                )}

                <FileText
                  size={20}
                  weight="regular"
                  style={{ color: "var(--accent)", flexShrink: 0 }}
                />
                
                <div className="flex-1 min-w-0 pointer-events-none select-none">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {formatBytes(file.size)}
                  </p>
                </div>

                {state === "done" ? (
                  <CheckCircle
                    size={18}
                    weight="fill"
                    style={{ color: "var(--accent)", flexShrink: 0 }}
                  />
                ) : state !== "processing" ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Move Up/Down buttons for accessible reordering */}
                    {multiple && (
                      <>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveUp(index)}
                          aria-label={`Geser ${file.name} ke atas`}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 disabled:opacity-30"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                        >
                          <ArrowUp size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          disabled={index === files.length - 1}
                          onClick={() => moveDown(index)}
                          aria-label={`Geser ${file.name} ke bawah`}
                          className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 disabled:opacity-30"
                          style={{ borderRadius: "var(--radius-btn)", color: "var(--muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                        >
                          <ArrowDown size={14} weight="bold" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveClick({ file, id })}
                      aria-label={`Hapus ${file.name}`}
                      className="w-7 h-7 flex items-center justify-center rounded transition-colors duration-150 hover:bg-red-50"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        color: "var(--muted)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    >
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation Modal */}
      {confirmFile && (
        <div className="fixed inset-0 bg-[#111111]/35 backdrop-blur-[3px] z-[999] flex items-center justify-center p-4">
          <div
            className="bg-white max-w-sm w-full p-6 shadow-xl border flex flex-col gap-5"
            style={{
              borderRadius: "var(--radius-card)",
              borderColor: "var(--border-solid)",
            }}
          >
            <div>
              <h3 className="text-base font-semibold text-[#111111] mb-1">
                Hapus dokumen ini?
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed break-all">
                Apakah Anda yakin ingin menghapus <strong>{confirmFile.file.name}</strong> dari daftar pengerjaan?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmFile(null)}
                className="px-4 py-2 text-xs font-medium rounded transition-colors duration-150"
                style={{
                  color: "var(--muted)",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-btn)",
                  border: "1px solid var(--border-solid)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--border-solid)";
                  e.currentTarget.style.color = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="px-4 py-2 text-xs font-medium text-white rounded transition-colors duration-150"
                style={{
                  background: "#dc2626",
                  borderRadius: "var(--radius-btn)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { DroppedFile };
