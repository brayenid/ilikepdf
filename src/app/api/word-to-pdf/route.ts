import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Tidak ada file yang dikirim." }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".doc") && !fileName.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Hanya .doc dan .docx yang diterima." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use mammoth to convert .docx to HTML
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth") as {
      convertToHtml: (opt: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }>;
    };

    const { value: bodyHtml } = await mammoth.convertToHtml({ buffer });

    // Return a self-printing HTML page.
    // The user opens it in a new tab, the browser's Print dialog opens automatically,
    // they choose "Save as PDF". No Chromium binary needed.
    const outputName = file.name.replace(/\.(docx?)$/i, "") + ".html";

    const printableHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${file.name.replace(/\.(docx?)$/i, "")}</title>
  <style>
    @media print {
      @page { size: A4; margin: 2cm; }
      body { margin: 0; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Arial", "Georgia", "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
    }
    h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em; font-weight: bold; line-height: 1.2; }
    p { margin-bottom: 0.8em; text-align: justify; }
    ul, ol { margin-left: 1.5em; margin-bottom: 0.8em; }
    
    /* Table styles */
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
    td, th { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
    th { background-color: #f9f9f9; font-weight: bold; }
    
    /* Layout table override (e.g. letterheads with logos should be borderless) */
    table:has(img) td,
    table:has(img) th {
      border: none !important;
      padding: 4px 8px;
    }
    
    /* Image scaling rules for professional documents */
    img {
      max-width: 100%;
      height: auto;
      max-height: 10cm;
      object-fit: contain;
    }
    
    /* Specific sizing for header logo images (first paragraph or layout tables) */
    body > p:first-of-type img,
    table:has(img) img {
      max-width: 120px !important;
      max-height: 120px !important;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>
${bodyHtml}
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    return new NextResponse(printableHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${outputName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[word-to-pdf]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengonversi file. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
