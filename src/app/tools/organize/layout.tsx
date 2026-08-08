import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kelola Halaman PDF",
  description:
    "Susun ulang, hapus, atau ubah urutan halaman dalam file PDF. Gratis, langsung di browser.",
};

export default function OrganizeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
