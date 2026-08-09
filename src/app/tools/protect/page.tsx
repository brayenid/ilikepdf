"use client";

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { decryptPDF } from "@pdfsmaller/pdf-decrypt";
import ToolLayout from "@/components/ToolLayout";
import DropZone, { DroppedFile } from "@/components/DropZone";
import DownloadButton from "@/components/DownloadButton";
import { SpinnerGap, WarningCircle, Lock, LockOpen } from "@phosphor-icons/react";
import { streamDownload } from "@/utils/streamDownload";
import { usePreventUnload } from "@/hooks/usePreventUnload";

type PageState = "idle" | "loading" | "ready" | "processing" | "done" | "error";
type ActionType = "encrypt" | "decrypt";

export default function ProtectPage() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultBytes, setResultBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [outputName, setOutputName] = useState("");
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  // States
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [action, setAction] = useState<ActionType>("encrypt");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  usePreventUnload(files.length > 0);

  const handleFilesChange = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(newFiles);
    setErrorMsg("");
    setResultBytes(null);
    setPassword("");
    setConfirmPassword("");

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

      // Check if file is encrypted
      try {
        await PDFDocument.load(buf);
        // Loads without error -> Not encrypted
        setIsEncrypted(false);
        setAction("encrypt");
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("password") || msg.includes("decrypt") || msg.includes("encrypt") || msg.includes("Encrypted")) {
          setIsEncrypted(true);
          setAction("decrypt");
        } else {
          throw err;
        }
      }
      setPageState("ready");
    } catch {
      setErrorMsg("Gagal memuat file PDF. Pastikan format file benar.");
      setPageState("error");
    }
  }, []);

  const handleProcess = async () => {
    if (!pdfBuffer) return;
    setPageState("processing");
    setErrorMsg("");

    try {
      if (action === "encrypt") {
        if (!password) {
          setErrorMsg("Kata sandi tidak boleh kosong.");
          setPageState("ready");
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg("Konfirmasi kata sandi tidak cocok.");
          setPageState("ready");
          return;
        }

        // Load and save using pdf-lib to ensure compliance
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const savedBytes = await pdfDoc.save();

        // Encrypt using @pdfsmaller/pdf-encrypt-lite
        const encryptedBytes = await encryptPDF(savedBytes, password);
        setResultBytes(encryptedBytes as any);
        setPageState("done");
      } else {
        // Decrypt
        if (!password) {
          setErrorMsg("Masukkan kata sandi pembuka PDF.");
          setPageState("ready");
          return;
        }

        try {
          // Decrypt using @pdfsmaller/pdf-decrypt
          const decryptedBytes = await decryptPDF(new Uint8Array(pdfBuffer), password);
          setResultBytes(decryptedBytes as any);
          setPageState("done");
        } catch (err: any) {
          setErrorMsg("Kata sandi salah. Gagal membuka dokumen.");
          setPageState("ready");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat memproses dokumen.");
      setPageState("error");
    }
  };

  const handleDownload = useCallback(async () => {
    if (!resultBytes) return;
    const base = outputName.trim() || "output";
    const suffix = action === "encrypt" ? "-protected.pdf" : "-unlocked.pdf";
    const fileName = `kindalikepdf-${base}${suffix}`;
    await streamDownload(resultBytes, fileName);
  }, [resultBytes, outputName, action]);

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
      toolName="Keamanan PDF"
      toolHref="/tools/protect"
      description="Kunci file PDF dengan kata sandi (enkripsi) atau buka kunci PDF terproteksi (dekripsi) secara 100% aman dan lokal di browser Anda."
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
          <div className="p-6 border rounded-lg bg-white max-w-md" style={{ borderColor: "var(--border-solid)" }}>
            <div className="flex items-center gap-2 mb-4">
              {action === "encrypt" ? (
                <Lock size={18} className="text-teal-600" />
              ) : (
                <LockOpen size={18} className="text-teal-600" />
              )}
              <h3 className="text-sm font-semibold text-gray-900">
                {action === "encrypt" ? "Kunci & Enkripsi PDF" : "Buka Proteksi PDF"}
              </h3>
            </div>

            <div className="space-y-4 text-xs text-gray-700">
              {isEncrypted ? (
                <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded flex gap-2 mb-2">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Sistem mendeteksi file PDF ini <strong>terkunci</strong>. Masukkan kata sandi yang valid untuk membuka kuncinya.</span>
                </div>
              ) : (
                <p style={{ color: "var(--muted)" }}>
                  Dokumen ini tidak memiliki proteksi sandi. Tetapkan kata sandi di bawah untuk mengamankannya.
                </p>
              )}

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pass-input" className="font-medium text-gray-700">
                  {action === "encrypt" ? "Kata Sandi Baru" : "Kata Sandi Pembuka"}
                </label>
                <input
                  id="pass-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                  placeholder="Ketik kata sandi..."
                />
              </div>

              {/* Confirm Password (only for Encrypt) */}
              {action === "encrypt" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-pass-input" className="font-medium text-gray-700">
                    Konfirmasi Kata Sandi
                  </label>
                  <input
                    id="confirm-pass-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    style={{ borderColor: "var(--border-solid)", borderRadius: "var(--radius-btn)" }}
                    placeholder="Ulangi kata sandi..."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing State */}
        {pageState === "processing" && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <SpinnerGap size={13} className="animate-spin" />
            Sedang memproses enkripsi/dekripsi dokumen...
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
              onClick={handleProcess}
              disabled={pageState !== "ready" || !password}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", borderRadius: "var(--radius-btn)" }}
              onMouseEnter={(e) => {
                if (pageState === "ready" && password)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)";
              }}
            >
              {action === "encrypt" ? "Kunci PDF Sekarang" : "Buka Kunci PDF"}
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
                    {action === "encrypt" ? "-protected.pdf" : "-unlocked.pdf"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DownloadButton onDownload={handleDownload} label={action === "encrypt" ? "Unduh PDF Terkunci" : "Unduh PDF Terbuka"} />
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPageState("idle");
                    setPdfBuffer(null);
                    setOutputName("");
                    setPassword("");
                    setConfirmPassword("");
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
