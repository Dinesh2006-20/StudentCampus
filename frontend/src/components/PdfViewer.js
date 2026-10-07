import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PdfViewer = ({ src }) => {
  const box = useRef(null);
  const [w, setW] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.min(900, e.contentRect.width - 32)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative h-[55vh] lg:h-[80vh] overflow-auto" data-testid="paper-preview-frame">
      <div className="sticky top-2 z-10 flex justify-end px-3">
        <div className="glass border border-border rounded-xl flex items-center gap-1 p-1">
          <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-accent" data-testid="preview-zoom-out" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <span className="font-mono text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-accent" data-testid="preview-zoom-in" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <span className="font-mono text-xs px-2 text-muted-foreground">{pages}p</span>
        </div>
      </div>
      <Document file={src} onLoadSuccess={({ numPages }) => setPages(numPages)} loading={<div className="grid place-items-center h-64"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
        className="flex flex-col items-center gap-4 py-4 px-4">
        {Array.from({ length: pages }, (_, i) => (
          <Page key={i} pageNumber={i + 1} width={w * zoom} className="shadow-xl rounded-md overflow-hidden" renderTextLayer={false} renderAnnotationLayer={false} />
        ))}
      </Document>
    </div>
  );
};
