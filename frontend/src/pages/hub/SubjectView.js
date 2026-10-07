import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion } from "lucide-react";
import { get } from "@/lib/api";
import { EXAM_TYPES, EXAM_STYLE, ordinal } from "@/lib/campus";
import { PaperCard } from "@/components/PaperCard";
import { Empty } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

const Chip = ({ active, onClick, children, className, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className={cn("shrink-0 rounded-full border px-3.5 h-9 text-xs font-semibold uppercase tracking-wider transition-[transform,background-color] active:scale-95",
      active ? "bg-foreground text-background border-foreground" : className || "border-border text-muted-foreground hover:text-foreground")}>
    {children}
  </button>
);

export const SubjectView = ({ P, setP }) => {
  const base = { dept: P.dept, subject_code: P.subject };
  const { data: fac } = useQuery({ queryKey: ["facets", base], queryFn: () => get("/papers/facets", base) });
  const params = { ...base, exam_type: P.type, exam_year: P.ey, academic_year: P.ay, limit: 100 };
  const { data, isLoading } = useQuery({ queryKey: ["papers", params], queryFn: () => get("/papers", params) });
  const years = Object.keys(fac?.exam_years || {}).sort((a, b) => b - a);
  const ays = Object.keys(fac?.academic_years || {}).sort().reverse();
  const groups = {};
  (data?.items || []).forEach((p) => (groups[p.exam_year] ||= []).push(p));
  const s = data?.items?.[0];

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow">{P.dept} · {P.subject} {s && `· ${ordinal(s.semester)} Semester`}</div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mt-2">{P.sname || s?.subject_name || P.subject}</h1>
      </div>
      <div className="space-y-3 mb-8 sticky top-16 z-20 glass py-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent sm:backdrop-blur-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" data-testid="exam-type-filter">
          <Chip active={!P.type} onClick={() => setP({ type: "" })} testid="exam-type-filter-chip-all">All types</Chip>
          {EXAM_TYPES.filter((t) => fac?.exam_types?.[t]).map((t) => (
            <Chip key={t} active={P.type === t} onClick={() => setP({ type: t })} className={EXAM_STYLE[t]} testid={`exam-type-filter-chip-${t.toLowerCase().replace(/\s/g, "-")}`}>
              {t} <span className="opacity-60 ml-1 font-mono">{fac.exam_types[t]}</span>
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1" data-testid="exam-year-filter">
            <Chip active={!P.ey} onClick={() => setP({ ey: "" })} testid="exam-year-chip-all">All years</Chip>
            {years.map((y) => <Chip key={y} active={P.ey === y} onClick={() => setP({ ey: y })} testid={`exam-year-chip-${y}`}><span className="font-mono text-sm">{y}</span></Chip>)}
          </div>
          <Select value={P.ay || "all"} onValueChange={(v) => setP({ ay: v === "all" ? "" : v })}>
            <SelectTrigger className="h-9 w-[150px] rounded-full shrink-0" data-testid="academic-year-select"><SelectValue placeholder="Academic year" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All acad. years</SelectItem>{ays.map((a) => <SelectItem key={a} value={a}>AY {a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>}
      {data && data.items.length === 0 && <Empty icon={FileQuestion} title="No papers for this filter yet" sub="Try another exam type or year." />}
      <div className="space-y-10">
        {Object.keys(groups).sort((a, b) => b - a).map((y) => (
          <section key={y} className="grid lg:grid-cols-[120px_1fr] gap-4" data-testid={`year-group-${y}`}>
            <div className="lg:sticky lg:top-24 self-start flex lg:block items-baseline gap-3">
              <div className="font-mono text-4xl lg:text-5xl font-extrabold stamp leading-none">{y}</div>
              <div className="text-xs text-muted-foreground mt-2 font-mono">{groups[y].length} paper{groups[y].length > 1 && "s"}</div>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {groups[y].map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
