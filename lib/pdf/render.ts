import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Render a React PDF document to a Buffer on the server. The call into
 * @react-pdf/renderer is lazy so that the library — which is quite large —
 * only loads in the Node runtime of the route handler.
 */
export async function renderPdfToBuffer(
  element: ReactElement<DocumentProps>,
): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(element);
}

/**
 * Build a Next.js Response carrying a PDF payload with the given filename.
 * `inline` displays it in-browser; `attachment` forces a download.
 */
export function pdfResponse(
  buf: Buffer,
  filename: string,
  disposition: "inline" | "attachment" = "inline",
) {
  const safe = filename.replace(/[^\w\-\. ]/g, "_");
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safe}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
