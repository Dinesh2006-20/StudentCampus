import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, Clock3, History, CalendarX } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { get } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DeptSemPicker } from "@/components/DeptSemPicker";
import { PageHeader, Empty } from "@/components/PageHeader";
import { ExamPill } from "@/components/PaperCard";
import { useCountdown } from "@/pages/Home";
import { isoToday, yearOfSem } from "@/lib/campus";

const toIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const ExamRow = ({ e, i, dept, sem }) => {
  const c = useCountdown(e.date, e.start_time);
  const past = e.date < isoToday();
  const dt = new Date(`${e.date}T00:00:00`);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className={`surface p-4 sm:p-5 flex gap-4 ${past ? "opacity-55" : ""}`} data-testid={`exam-row-${e.id}`}>
      <div className="w-16 shrink-0 text-center rounded-xl bg-secondary py-2 h-fit">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{dt.toLocaleDateString(undefined, { month: "short" })}</div>
        <div className="font-mono text-2xl font-extrabold">{dt.getDate()}</div>
        <div className="text-[10px] text-muted-foreground">{dt.toLocaleDateString(undefined, { weekday: "short" })}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap"><ExamPill type={e.exam_type} /><span className="font-mono text-xs text-muted-foreground">{e.subject_code}</span></div>
        <div className="font-display font-bold text-lg mt-1.5 leading-snug">{e.subject_name}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{e.start_time}–{e.end_time}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.hall}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">{e.syllabus?.map((s) => <span key={s} className="text-[11px] rounded-md bg-secondary px-2 py-0.5">{s}</span>)}</div>
        <Link to={`/papers?dept=${dept}&year=${yearOfSem(sem)}&sem=${sem}&subject=${e.subject_code}&sname=${encodeURIComponent(e.subject_name)}&type=${encodeURIComponent(e.exam_type)}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mt-3" data-testid={`exam-practice-${e.id}`}>
          <History className="h-3.5 w-3.5" />Practice previous {e.exam_type} papers
        </Link>
      </div>
      {!past && c && <div className="hidden sm:block text-right font-mono shrink-0"><div className="text-3xl font-extrabold stamp leading-none">{c.d}</div><div className="text-[10px] uppercase text-muted-foreground">days</div><div className="text-xs text-muted-foreground mt-1">{c.h}h {c.m}m</div></div>}
    </motion.div>
  );
};

export default function Exams() {
  const { user } = useAuth();
  const [dept, setDept] = useState(user.dept);
  const [sem, setSem] = useState(user.semester);
  const [sel, setSel] = useState();
  const { data = [] } = useQuery({ queryKey: ["exams", dept, sem], queryFn: () => get("/exams", { dept, semester: sem }), enabled: !!dept && !!sem });
  const dates = data.map((e) => new Date(`${e.date}T00:00:00`));
  const list = sel ? data.filter((e) => e.date === toIso(sel)) : data.filter((e) => e.date >= isoToday()).concat(data.filter((e) => e.date < isoToday()));
  const next = data.find((e) => e.date >= isoToday());
  const c = useCountdown(next?.date, next?.start_time);

  return (
    <div data-testid="exams-page">
      <PageHeader eyebrow="Exam Schedule" title="Countdown to every exam" sub="Calendar, halls, syllabus and one-tap practice with past papers."
        right={<DeptSemPicker dept={dept} sem={sem} onDept={setDept} onSem={setSem} />} />
      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          {next && (
            <div className="surface p-5 relative overflow-hidden" data-testid="exam-next-countdown">
              <div className="eyebrow">Next up · {next.exam_type}</div>
              <div className="font-display font-bold text-lg mt-2">{next.subject_name}</div>
              <div className="grid grid-cols-4 gap-2 mt-4 font-mono text-center">
                {[["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]].map(([k, l]) => <div key={k} className="rounded-xl bg-secondary py-2"><div className="text-2xl font-extrabold stamp">{String(c?.[k] ?? 0).padStart(2, "0")}</div><div className="text-[10px] uppercase text-muted-foreground">{l}</div></div>)}
              </div>
            </div>
          )}
          <div className="surface p-3 flex justify-center" data-testid="exam-calendar">
            <Calendar mode="single" selected={sel} onSelect={setSel} modifiers={{ exam: dates }}
              modifiersClassNames={{ exam: "!font-bold !text-amber-600 dark:!text-amber-400 underline decoration-2 underline-offset-4" }} />
          </div>
          {sel && <button onClick={() => setSel(undefined)} className="w-full h-10 rounded-xl border border-border text-sm hover:bg-accent" data-testid="exam-clear-date">Show all exams</button>}
        </div>
        <div className="space-y-3">
          {list.length === 0 ? <Empty icon={CalendarX} title="No exams on this date" sub="Underlined dates on the calendar have exams." />
            : list.map((e, i) => <ExamRow key={e.id} e={e} i={i} dept={dept} sem={sem} />)}
        </div>
      </div>
    </div>
  );
}
