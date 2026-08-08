import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Word ke PDF",
  description:
    "Konversi dokumen Microsoft Word (.docx) ke format PDF secara gratis. Kualitas tinggi, privat.",
};

export default function WordToPdfLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
