import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Gabungkan PDF",
  description:
    "Satukan dua atau lebih file PDF menjadi satu dokumen. Gratis, langsung di browser, tanpa menyimpan file ke server.",
};

export default function MergeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
