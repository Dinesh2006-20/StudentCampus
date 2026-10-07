import { motion } from "framer-motion";
import { Eye, Download, Bookmark, BookmarkCheck, FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { usePapers } from "@/context/PaperContext";
import { EXAM_STYLE, DEPT_META, ordinal } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const ExamPill = ({ type, className }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", EXAM_STYLE[type] || "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30", className)}>
    {type}
  </span>
);

export const PaperCard = ({ paper: p, index = 0 }) => {
  const { savedIds, toggleSave, download, preview } = usePapers();
  const saved = savedIds.has(p.id);
  const meta = DEPT_META[p.dept] || DEPT_META.IT;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.35 }}
      className="group relative surface overflow-hidden hover:border-primary/40 transition-colors"
      data-testid={`paper-card-${p.id}`}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", meta.bg)} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn("font-mono text-[11px] font-semibold", meta.text)}>{p.dept}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{p.subject_code}</span>
              <span className="text-[11px] text-muted-foreground">· {ordinal(p.semester)} sem</span>
            </div>
            <h3 className="font-display font-semibold leading-snug text-[15px] line-clamp-2">{p.subject_name}</h3>
          </div>
          <div className="text-right shrink-0" data-testid="exam-year-badge">
            <div className="font-mono text-2xl font-extrabold leading-none stamp">{p.exam_year}</div>
            <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase">{p.exam_month}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <ExamPill type={p.exam_type} />
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            {p.file_type === "PDF" ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}{p.file_type}
          </span>
          {p.has_solution && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"><Sparkles className="h-3 w-3" />Key</span>}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>AY {p.academic_year} · {p.max_marks}M</span>
          <span>{p.downloads} dl</span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => preview(p)} data-testid={`paper-card-preview-button-${p.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-[opacity,transform]">
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button onClick={() => download(p)} data-testid={`paper-card-download-button-${p.id}`} aria-label="Download"
            className="h-9 w-9 grid place-items-center rounded-xl border border-border hover:bg-accent active:scale-95 transition-[background-color,transform]">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={() => toggleSave(p)} data-testid={`paper-card-bookmark-button-${p.id}`} aria-label="Bookmark"
            className={cn("h-9 w-9 grid place-items-center rounded-xl border active:scale-95 transition-[background-color,transform]",
              saved ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border hover:bg-accent")}>
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.article>
  );
};
