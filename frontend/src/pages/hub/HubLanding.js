import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { DeptCard } from "@/components/DeptCard";
import { EXAM_TYPES, DEPTS, EXAM_STYLE } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const HubLanding = ({ meta, setP, user }) => {
  const [q, setQ] = useState("");
  const years = meta?.year_max ? Array.from({ length: meta.year_max - meta.year_min + 1 }, (_, i) => meta.year_max - i) : [];
  const depts = meta?.departments || DEPTS;
  return (
    <div>
      <section className="relative surface overflow-hidden p-6 sm:p-10 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/60" />
        <div className="relative max-w-3xl">
          <div className="eyebrow">Previous Question Paper Hub</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mt-3 leading-[1.05]">
            <span className="font-mono stamp">{meta?.total_papers?.toLocaleString() ?? "…"}</span> papers,<br />from {meta?.year_min ?? "…"} to {meta?.year_max ?? "…"}.
          </h1>
          <form onSubmit={(e) => { e.preventDefault(); setP({ q: q.trim() }, true); }} className="mt-7 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Subject, code, exam or year — e.g. DBMS 2025"
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-base" data-testid="global-search-input" />
            </div>
            <button className="h-14 px-5 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2" data-testid="hub-search-submit">
              <span className="hidden sm:inline">Search</span><ArrowRight className="h-5 w-5" />
            </button>
          </form>
          <div className="mt-5 flex gap-2 flex-wrap">
            {EXAM_TYPES.map((t) => (
              <button key={t} onClick={() => setP({ view: "all", type: t }, true)} data-testid={`quick-type-${t.toLowerCase().replace(/\s/g, "-")}`}
                className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:scale-[1.03] transition-transform", EXAM_STYLE[t])}>{t}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between mt-12 mb-5">
        <div><div className="eyebrow">Step 1</div><h2 className="font-display text-2xl font-bold mt-1">Choose your department</h2></div>
        <button onClick={() => setP({ view: "all" }, true)} className="text-sm text-primary font-semibold" data-testid="browse-all-papers">Browse all →</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {depts.map((d, i) => <DeptCard key={d.code} d={d} index={i} onClick={() => setP({ dept: d.code, year: d.code === user.dept ? Math.ceil(user.semester / 2) : 1, sem: d.code === user.dept ? user.semester : 1 }, true)} />)}
      </div>

      <div className="mt-12">
        <div className="eyebrow mb-3">Jump to an exam year</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2" data-testid="year-filter-strip">
          {years.map((y) => (
            <button key={y} onClick={() => setP({ view: "all", ey: y }, true)} data-testid={`year-chip-${y}`}
              className="shrink-0 font-mono font-bold text-lg px-5 py-3 rounded-2xl border border-border hover:border-amber-500/50 hover:text-amber-500 transition-colors">{y}</button>
          ))}
        </div>
      </div>
    </div>
  );
};
