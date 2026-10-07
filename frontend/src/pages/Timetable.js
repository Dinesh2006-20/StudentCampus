import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MapPin, User2, FlaskConical, Coffee } from "lucide-react";
import { get } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DeptSemPicker } from "@/components/DeptSemPicker";
import { PageHeader, Empty } from "@/components/PageHeader";
import { DAYS, todayName, toMin, nowMin } from "@/lib/campus";
import { cn } from "@/lib/utils";

const STATUS = {
  done: ["Completed", "bg-muted text-muted-foreground"],
  live: ["In progress", "bg-primary text-primary-foreground"],
  next: ["Upcoming", "bg-secondary text-foreground"],
};

export default function Timetable() {
  const { user } = useAuth();
  const [dept, setDept] = useState(user.dept);
  const [sem, setSem] = useState(user.semester);
  const today = todayName();
  const [day, setDay] = useState(DAYS.includes(today) ? today : "Monday");
  const [view, setView] = useState("day");
  const { data = [] } = useQuery({ queryKey: ["timetable", dept, sem], queryFn: () => get("/timetable", { dept, semester: sem }), enabled: !!dept && !!sem });
  const list = data.filter((x) => x.day === day);
  const n = nowMin();
  const status = (x) => (day !== today ? "next" : n >= toMin(x.end) ? "done" : n >= toMin(x.start) ? "live" : "next");
  const slots = [...new Set(data.map((x) => x.start))].sort();

  return (
    <div data-testid="timetable-page">
      <PageHeader eyebrow="Smart Timetable" title="Your week, period by period" sub="Live status for today's classes, rooms and labs."
        right={<DeptSemPicker dept={dept} sem={sem} onDept={setDept} onSem={setSem} />} />
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar" data-testid="timetable-day-tabs">
          {DAYS.map((d) => (
            <button key={d} onClick={() => { setDay(d); setView("day"); }} data-testid={`timetable-day-tab-${d.toLowerCase()}`}
              className={cn("relative shrink-0 w-14 h-16 rounded-2xl border flex flex-col items-center justify-center transition-colors",
                d === day && view === "day" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent")}>
              <span className="text-[10px] uppercase tracking-wider opacity-70">{d.slice(0, 3)}</span>
              {d === today && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5" />}
            </button>
          ))}
        </div>
        <button onClick={() => setView(view === "day" ? "week" : "day")} className="hidden md:inline-flex h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-accent" data-testid="timetable-view-toggle">
          {view === "day" ? "Week grid" : "Day view"}
        </button>
      </div>

      {view === "day" ? (
        list.length === 0 ? <Empty icon={Coffee} title="No classes scheduled" sub="Pick another day or semester." /> : (
          <div className="relative pl-6 sm:pl-24">
            <div className="absolute left-2 sm:left-[76px] top-2 bottom-2 w-px bg-border" />
            {list.map((x, i) => {
              const st = status(x);
              return (
                <motion.div key={x.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative mb-3" data-testid={`period-${x.id}`}>
                  <div className="hidden sm:block absolute -left-24 top-5 w-16 text-right font-mono text-sm"><div className="font-bold">{x.start}</div><div className="text-xs text-muted-foreground">{x.end}</div></div>
                  <span className={cn("absolute -left-[22px] sm:-left-[26px] top-6 h-3 w-3 rounded-full border-2 border-background", st === "live" ? "bg-primary ring-4 ring-primary/25" : st === "done" ? "bg-muted-foreground/40" : "bg-secondary border-border")} />
                  <div className={cn("surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3", st === "live" && "border-primary/50", st === "done" && "opacity-60")}>
                    <div className="sm:hidden font-mono text-xs text-muted-foreground">{x.start} – {x.end}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{x.subject_code}</span>{x.kind === "Lab" && <FlaskConical className="h-3.5 w-3.5 text-emerald-500" />}<span className="text-[11px] uppercase tracking-wider text-muted-foreground">{x.kind}</span></div>
                      <div className="font-display font-bold text-lg leading-snug">{x.subject_name}</div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1.5"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{x.room}</span><span className="inline-flex items-center gap-1"><User2 className="h-3 w-3" />{x.faculty}</span></div>
                    </div>
                    <span className={cn("self-start sm:self-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", STATUS[st][1])}>{STATUS[st][0]}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        <div className="surface overflow-x-auto" data-testid="timetable-week-grid">
          <table className="w-full text-sm">
            <thead><tr><th className="p-3 text-left eyebrow">Day</th>{slots.map((s) => <th key={s} className="p-3 font-mono text-xs text-muted-foreground">{s}</th>)}</tr></thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d} className={cn("border-t border-border", d === today && "bg-primary/5")}>
                  <td className="p-3 font-semibold">{d.slice(0, 3)}</td>
                  {slots.map((s) => { const x = data.find((e) => e.day === d && e.start === s); return <td key={s} className="p-2"><div className={cn("rounded-lg px-2 py-1.5 text-xs", x ? (x.kind === "Lab" ? "bg-emerald-500/10" : "bg-secondary") : "")}>{x ? <><div className="font-mono font-semibold">{x.subject_code}</div><div className="text-muted-foreground truncate max-w-[120px]">{x.subject_name}</div></> : "—"}</div></td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
