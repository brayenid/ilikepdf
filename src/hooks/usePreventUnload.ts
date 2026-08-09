import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook to prevent accidental tab close, page reload, or in-app client-side navigation when there is active data.
 * If the user has downloaded the result, the confirmation prompt is automatically bypassed.
 * @param enabled Whether to enable the confirmation prompt (e.g. files are uploaded).
 */
export function usePreventUnload(enabled: boolean) {
  const [downloaded, setDownloaded] = useState(false);
  const pathname = usePathname();

  // Reset downloaded state when path changes or when tool is disabled/reset
  useEffect(() => {
    if (!enabled) {
      setDownloaded(false);
    }
  }, [enabled, pathname]);

  // Listen to custom download event
  useEffect(() => {
    const handleDownload = () => {
      setDownloaded(true);
    };

    window.addEventListener("app-file-downloaded", handleDownload);
    return () => {
      window.removeEventListener("app-file-downloaded", handleDownload);
    };
  }, []);

  const shouldPrevent = enabled && !downloaded;

  useEffect(() => {
    if (!shouldPrevent) return;

    // 1. Prevent reload or tab close (beforeunload)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Apakah Anda yakin ingin meninggalkan halaman? File yang telah diunggah akan hilang.";
      return e.returnValue;
    };

    // 2. Prevent client-side navigation (internal link clicks)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        // Check if it's an internal link
        if (
          href &&
          !href.startsWith("#") &&
          !href.startsWith("javascript:") &&
          (href.startsWith("/") || href.startsWith(window.location.origin))
        ) {
          const confirmLeave = window.confirm(
            "Apakah Anda yakin ingin meninggalkan halaman? File yang telah diunggah akan hilang."
          );
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    // 3. Handle browser back/forward buttons (popstate)
    const handlePopState = (e: PopStateEvent) => {
      // Trigger confirmation
      const confirmLeave = window.confirm(
        "Apakah Anda yakin ingin meninggalkan halaman? File yang telah diunggah akan hilang."
      );
      if (!confirmLeave) {
        // Push state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true); // Use capture phase to intercept before router
    window.addEventListener("popstate", handlePopState);

    // Push an initial state for popstate tracking
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldPrevent]);
}
