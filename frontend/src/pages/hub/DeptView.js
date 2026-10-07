import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FlaskConical, BookOpen } from "lucide-react";
import { get } from "@/lib/api";
import { DEPT_META, ordinal, semsOfYear } from "@/lib/campus";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Seg = ({ items, value, onChange, testid }) => (
  <div className="inline-flex p-1 rounded-2xl bg-secondary gap-1 overflow-x-auto no-scrollbar max-w-full" data-testid={testid}>
    {items.map(([v, label]) => (
      <button key={v} onClick={() => onChange(v)} data-testid={`${testid}-${v}`}
        className={cn("relative px-4 h-9 rounded-xl text-sm font-semibold whitespace-nowrap", String(value) === String(v) ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
        {String(value) === String(v) && <motion.span layoutId={testid} className="absolute inset-0 rounded-xl bg-background shadow-sm" />}
        <span className="relative">{label}</span>
      </button>
    ))}
  </div>
);

export const DeptView = ({ P, setP, deptName }) => {
  const year = +(P.year || 1);
  const sem = +(P.sem || semsOfYear(year)[0]);
  const m = DEPT_META[P.dept] || DEPT_META.IT;
  const Icon = m.icon;
  const { data: subs, isLoading } = useQuery({ queryKey: ["subjects", P.dept, sem], queryFn: () => get("/subjects", { dept: P.dept, semester: sem }) });

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className={`h-14 w-14 rounded-2xl border grid place-items-center ${m.soft}`}><Icon className={`h-7 w-7 ${m.text}`} /></div>
        <div>
          <div className="eyebrow">{P.dept} Department</div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">{deptName}</h1>
        </div>
      </div>
      <div className="flex flex-col gap-3 mb-8">
        <Seg testid="year-filter-select" value={year} onChange={(y) => setP({ year: y, sem: semsOfYear(+y)[0] })} items={[1, 2, 3, 4].map((y) => [y, `${ordinal(y)} Year`])} />
        <Seg testid="semester-tab-list" value={sem} onChange={(s) => setP({ sem: s })} items={semsOfYear(year).map((s) => [s, `Semester ${s}`])} />
      </div>
      <div className="eyebrow mb-3">Subjects · {ordinal(sem)} Semester</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        {subs?.map((s, i) => (
          <motion.button key={s.id} onClick={() => setP({ subject: s.code, sname: s.name, type: "", ey: "" })}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}
            className="text-left surface p-5 hover:border-primary/40 transition-colors flex flex-col min-h-[176px]" data-testid={`subject-card-${s.code.toLowerCase()}`}>
            <div className="flex justify-between items-start">
              <span className={`font-mono text-xs font-semibold ${m.text}`}>{s.code}</span>
              {s.is_lab ? <FlaskConical className="h-4 w-4 text-emerald-500" /> : <BookOpen className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="font-display font-bold text-lg leading-snug mt-3">{s.name}</div>
            <div className="mt-auto pt-4 flex items-end justify-between">
              <div className="font-mono text-xs text-muted-foreground">{s.papers} papers</div>
              {s.first_year && <div className="font-mono text-xs"><span className="text-muted-foreground">{s.first_year}–</span><span className="stamp font-bold">{s.latest_year}</span></div>}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
