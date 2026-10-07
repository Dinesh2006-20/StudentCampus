import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Printer, ExternalLink, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { get, paperBlob, errMsg } from "@/lib/api";
import { usePapers } from "@/context/PaperContext";
import { ExamPill } from "@/components/PaperCard";
import { ordinal } from "@/lib/campus";
import { PdfViewer } from "@/components/PdfViewer";

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 py-2 border-b border-border/60 text-sm">
    <span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span>
  </div>
);

export const PaperPreview = ({ paperId, onClose, onSwitch }) => {
  const { savedIds, toggleSave, download } = usePapers();
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(null);
  const { data: p } = useQuery({ queryKey: ["paper", paperId], queryFn: () => get(`/papers/${paperId}`), enabled: !!paperId });

  useEffect(() => {
    if (!paperId) return;
    let u; setUrl(null); setErr(null);
    paperBlob(paperId).then((b) => { u = URL.createObjectURL(b); setUrl({ src: u, type: b.type }); }).catch((e) => setErr(errMsg(e)));
    return () => u && URL.revokeObjectURL(u);
  }, [paperId]);

  const isImg = url?.type?.startsWith("image/");
  const print = () => {
    const w = window.open(url.src);
    if (w) w.onload = () => w.print();
  };

  return (
    <Dialog open={!!paperId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] p-0 overflow-y-auto lg:overflow-hidden max-h-[92vh] flex flex-col lg:flex-row gap-0" data-testid="paper-preview-modal">
        <div className="flex-1 bg-muted/40 min-h-[55vh] lg:min-h-[80vh] relative">
          {!url && !err && <div className="absolute inset-0 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
          {err && <div className="absolute inset-0 grid place-items-center text-sm text-destructive p-6">{err}</div>}
          {url && (isImg
            ? <img src={url.src} alt="Question paper" className="w-full h-full max-h-[80vh] object-contain" data-testid="paper-preview-image" />
            : <PdfViewer src={url.src} />)}
        </div>
        <aside className="w-full lg:w-[340px] p-5 overflow-y-auto border-t lg:border-t-0 lg:border-l border-border">
          {p ? (
            <>
              <div className="eyebrow">{p.dept_name}</div>
              <DialogTitle className="font-display text-xl font-bold mt-1 leading-tight">{p.subject_name}</DialogTitle>
              <DialogDescription className="font-mono text-xs mt-1">{p.subject_code} · {ordinal(p.semester)} Semester</DialogDescription>
              <div className="mt-4 flex items-end justify-between">
                <ExamPill type={p.exam_type} />
                <div className="font-mono text-4xl font-extrabold stamp leading-none" data-testid="preview-exam-year">{p.exam_year}</div>
              </div>
              <div className="mt-4">
                <Row k="Exam session" v={`${p.exam_month} ${p.exam_year}`} />
                <Row k="Academic year" v={p.academic_year} />
                <Row k="Class" v={`${ordinal(p.class_year)} Year`} />
                <Row k="Max marks / time" v={`${p.max_marks} · ${p.duration}`} />
                <Row k="Regulation" v={p.regulation} />
                <Row k="Downloads" v={p.downloads} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <button onClick={() => download(p)} data-testid="preview-download-button" className="col-span-2 h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90"><Download className="h-4 w-4" />Download</button>
                <button onClick={print} disabled={!url} data-testid="preview-print-button" className="h-10 rounded-xl border border-border inline-flex items-center justify-center gap-2 text-sm hover:bg-accent"><Printer className="h-4 w-4" />Print</button>
                <button onClick={() => url && window.open(url.src, "_blank")} data-testid="preview-open-button" className="h-10 rounded-xl border border-border inline-flex items-center justify-center gap-2 text-sm hover:bg-accent"><ExternalLink className="h-4 w-4" />Open</button>
                <button onClick={() => toggleSave(p)} data-testid="preview-bookmark-button" className="col-span-2 h-10 rounded-xl border border-border inline-flex items-center justify-center gap-2 text-sm hover:bg-accent">
                  {savedIds.has(p.id) ? <><BookmarkCheck className="h-4 w-4 text-amber-500" />Saved</> : <><Bookmark className="h-4 w-4" />Save to library</>}
                </button>
              </div>
              {p.related?.length > 0 && (
                <div className="mt-6">
                  <div className="eyebrow mb-2">Same subject, other papers</div>
                  <div className="space-y-1.5">
                    {p.related.map((r) => (
                      <button key={r.id} onClick={() => onSwitch(r)} data-testid={`related-paper-${r.id}`}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent transition-colors">
                        <span className="truncate">{r.exam_type}</span><span className="font-mono font-bold stamp">{r.exam_year}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <><DialogTitle className="sr-only">Loading paper</DialogTitle><DialogDescription className="sr-only">Loading</DialogDescription><Loader2 className="h-5 w-5 animate-spin" /></>}
        </aside>
      </DialogContent>
    </Dialog>
  );
};
