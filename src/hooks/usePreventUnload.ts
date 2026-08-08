import { useEffect } from "react";

/**
 * Hook to prevent accidental tab close or page reload when there is active data.
 * @param enabled Whether to enable the confirmation prompt.
 */
export function usePreventUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Standard way to show browser confirmation prompt
      e.returnValue = "Apakah Anda yakin ingin meninggalkan halaman? File yang telah diunggah akan hilang.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
