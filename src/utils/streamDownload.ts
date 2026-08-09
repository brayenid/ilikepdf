/**
 * Downloads a Uint8Array or Blob using standard Object URL triggering.
 * This ensures the download appears in the browser's native download manager/status bar
 * and is logged in the download history.
 */
export async function streamDownload(
  data: Uint8Array | Blob,
  fileName: string,
  mimeType: string = "application/pdf"
): Promise<void> {
  const isUint8Array = data instanceof Uint8Array;
  const blob = isUint8Array ? new Blob([data as any], { type: mimeType }) : data;
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  
  // Clean up DOM and revoke URL
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);

  // Trigger custom event so hooks/listeners can detect download action
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app-file-downloaded"));
  }
}
