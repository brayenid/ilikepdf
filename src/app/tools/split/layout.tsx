import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pisahkan PDF",
  description:
    "Ambil halaman tertentu dari file PDF dan simpan sebagai file terpisah. Gratis, langsung di browser.",
};

export default function SplitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
