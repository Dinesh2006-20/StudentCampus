import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, CalendarDays, Bookmark, ClipboardList, Target, Library, Flame, History } from "lucide-react";
import { get } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { usePapers } from "@/context/PaperContext";
import { PaperCard } from "@/components/PaperCard";
import { DEPT_META, ordinal, todayName, toMin, nowMin } from "@/lib/campus";

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export const useCountdown = (iso, time = "09:00") => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!iso) return null;
  const ms = Math.max(0, new Date(`${iso}T${time}:00`).getTime() - now);
  return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
};

const Tile = ({ icon: Icon, label, value, to, delay, testid }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Link to={to} className="surface p-4 sm:p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors h-full" data-testid={testid}>
      <div className="flex justify-between"><Icon className="h-5 w-5 text-muted-foreground" /><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div>
      <div><div className="font-mono text-2xl sm:text-3xl font-extrabold">{value ?? "–"}</div><div className="text-xs text-muted-foreground mt-1">{label}</div></div>
    </Link>
  </motion.div>
);

const NextExam = ({ exam }) => {
  const c = useCountdown(exam?.date, exam?.start_time);
  return (
    <Link to="/exams" className="surface p-5 sm:p-6 flex flex-col h-full relative overflow-hidden hover:border-primary/40 transition-colors" data-testid="home-next-exam">
      <div className="eyebrow flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />Next exam</div>
      {exam ? (<>
        <div className="font-display font-bold text-lg mt-3 leading-snug">{exam.subject_name}</div>
        <div className="text-xs text-muted-foreground mt-1">{exam.exam_type} · {exam.date} · {exam.hall}</div>
        <div className="grid grid-cols-4 gap-2 mt-auto pt-5 font-mono text-center">
          {[["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]].map(([k, l]) => (
            <div key={k} className="rounded-xl bg-secondary py-2"><div className="text-xl sm:text-2xl font-extrabold stamp">{String(c?.[k] ?? 0).padStart(2, "0")}</div><div className="text-[10px] text-muted-foreground uppercase">{l}</div></div>
          ))}
        </div>
      </>) : <div className="text-sm text-muted-foreground mt-3">No upcoming exams scheduled.</div>}
    </Link>
  );
};

const TodayClasses = ({ user }) => {
  const { data = [] } = useQuery({ queryKey: ["timetable", user.dept, user.semester], queryFn: () => get("/timetable", { dept: user.dept, semester: user.semester }) });
  const today = data.filter((x) => x.day === todayName());
  const n = nowMin();
  const current = today.find((x) => toMin(x.start) <= n && n < toMin(x.end));
  const next = today.find((x) => toMin(x.start) > n);
  return (
    <Link to="/timetable" className="surface p-5 sm:p-6 h-full flex flex-col hover:border-primary/40 transition-colors" data-testid="home-today-classes">
      <div className="eyebrow flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Today · {todayName()}</div>
      {today.length === 0 ? <div className="text-sm text-muted-foreground mt-3">No classes today. Recharge.</div> : (<>
        <div className="mt-3">
          <div className="text-xs text-muted-foreground">{current ? "In progress" : next ? `Up next at ${next.start}` : "Classes done for today"}</div>
          <div className="font-display font-bold text-lg leading-snug">{(current || next)?.subject_name || "You're free"}</div>
          {(current || next) && <div className="text-xs text-muted-foreground font-mono mt-1">{(current || next).room}</div>}
        </div>
        <div className="flex gap-1 mt-auto pt-5">
          {today.map((x) => {
            const st = n >= toMin(x.end) ? "bg-muted-foreground/30" : n >= toMin(x.start) ? "bg-primary" : "bg-secondary";
            return <div key={x.id} className={`h-2 flex-1 rounded-full ${st}`} title={`${x.start} ${x.subject_name}`} />;
          })}
        </div>
        <div className="text-[11px] text-muted-foreground mt-2 font-mono">{today.length} periods</div>
      </>)}
    </Link>
  );
};

export default function Home() {
  const { user } = useAuth();
  const { recent } = usePapers();
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard") });
  const { data: trending = [] } = useQuery({ queryKey: ["trending", user.dept], queryFn: () => get("/papers/trending", { dept: user.dept }) });
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", user.dept, user.semester], queryFn: () => get("/subjects", { dept: user.dept, semester: user.semester }) });
  const m = DEPT_META[user.dept] || DEPT_META.IT;
  const hubLink = (extra = "") => `/papers?dept=${user.dept}&year=${Math.ceil(user.semester / 2)}&sem=${user.semester}${extra}`;

  return (
    <div className="space-y-10" data-testid="home-page">
      <div className="grid lg:grid-cols-12 gap-4">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-6 relative surface overflow-hidden p-6 sm:p-8 grain min-h-[260px] flex flex-col">
          <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-25 ${m.bg}`} />
          <div className="relative eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1 className="relative font-display text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 leading-[1.05]" data-testid="home-greeting">
            {greet()},<br /><span className="text-primary">{user.name.split(" ")[0]}</span>.
          </h1>
          <div className="relative mt-auto pt-6 flex flex-wrap gap-2 items-center">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${m.soft} ${m.text}`}>{user.dept}</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{ordinal(Math.ceil(user.semester / 2))} Year · Sem {user.semester}</span>
            <Link to={hubLink()} className="ml-auto inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90" data-testid="home-open-my-papers">
              My semester papers <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.section>
        <div className="lg:col-span-3"><TodayClasses user={user} /></div>
        <div className="lg:col-span-3"><NextExam exam={dash?.upcoming_exams?.[0]} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon={Library} label={`Papers for Sem ${user.semester}`} value={dash?.sem_papers} to={hubLink()} delay={0.05} testid="stat-sem-papers" />
        <Tile icon={Bookmark} label="Saved papers" value={dash?.bookmarks} to="/saved" delay={0.1} testid="stat-bookmarks" />
        <Tile icon={ClipboardList} label="Pending tasks" value={dash?.tasks_pending} to="/planner" delay={0.15} testid="stat-tasks" />
        <Tile icon={Target} label="Average score" value={dash?.avg_score != null ? `${dash.avg_score}%` : "–"} to="/progress" delay={0.2} testid="stat-avg" />
      </div>

      <section>
        <div className="flex items-end justify-between mb-4"><div><div className="eyebrow">This semester</div><h2 className="font-display text-2xl font-bold mt-1">Your subjects</h2></div></div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {subs.map((s) => (
            <Link key={s.id} to={hubLink(`&subject=${s.code}&sname=${encodeURIComponent(s.name)}`)} data-testid={`home-subject-${s.code.toLowerCase()}`}
              className="shrink-0 w-56 surface p-4 hover:border-primary/40 transition-colors">
              <div className={`font-mono text-xs font-semibold ${m.text}`}>{s.code}</div>
              <div className="font-display font-bold mt-2 leading-snug line-clamp-2 min-h-[44px]">{s.name}</div>
              <div className="font-mono text-xs text-muted-foreground mt-3">{s.papers} papers · up to <span className="stamp font-bold">{s.latest_year}</span></div>
            </Link>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <div className="eyebrow flex items-center gap-2 mb-4"><History className="h-3.5 w-3.5" />Recently viewed</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{recent.slice(0, 4).map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}</div>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between mb-4">
          <div><div className="eyebrow flex items-center gap-2"><Flame className="h-3.5 w-3.5 text-orange-500" />Trending in {user.dept}</div><h2 className="font-display text-2xl font-bold mt-1">Most downloaded papers</h2></div>
          <Link to={`/papers?view=all&dept=${user.dept}&sort=popular`} className="text-sm text-primary font-semibold" data-testid="home-trending-all">See all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{trending.slice(0, 8).map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}</div>
      </section>
    </div>
  );
}
