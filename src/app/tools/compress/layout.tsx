import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kompres PDF",
  description:
    "Kurangi ukuran file PDF tanpa banyak mengorbankan kualitas. Tiga tingkat kompresi tersedia, gratis.",
};

export default function CompressLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
