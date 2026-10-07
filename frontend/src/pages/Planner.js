import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, ChevronRight, ChevronLeft, Play, Pause, RotateCcw, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, get, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { isoToday } from "@/lib/campus";
import { cn } from "@/lib/utils";

const COLS = [["todo", "To do"], ["doing", "In progress"], ["done", "Done"]];
const PRI = { High: "bg-rose-500/15 text-rose-600 dark:text-rose-400", Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
const toIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const AddTask = ({ open, setOpen, subjects, onSaved }) => {
  const [f, setF] = useState({ title: "", subject: "", due_date: isoToday(), priority: "Medium" });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/tasks", f); toast.success("Task added"); setOpen(false); setF({ ...f, title: "" }); onSaved(); }
    catch (x) { toast.error(errMsg(x)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="planner-task-dialog">
        <DialogTitle className="font-display">New study task</DialogTitle>
        <DialogDescription>Plan revision, assignments or paper practice.</DialogDescription>
        <form onSubmit={save} className="space-y-4">
          <div><Label>Task</Label><Input required className="mt-1.5 h-10 rounded-xl" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Solve 2024 Model Exam paper" data-testid="task-title-input" /></div>
          <div><Label>Subject</Label>
            <Select value={f.subject || "none"} onValueChange={(v) => setF({ ...f, subject: v === "none" ? "" : v })}>
              <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid="task-subject-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">General</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Due date</Label><Input type="date" required className="mt-1.5 h-10 rounded-xl" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} data-testid="task-date-input" /></div>
            <div><Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
                <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(PRI).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold" data-testid="task-save-button">Add task</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Focus = () => {
  const [mode, setMode] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { setRun(false); toast.success(mode === 25 ? "Focus session complete. Take a break!" : "Break over. Back to it!"); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [run, mode]);
  const pick = (m) => { setMode(m); setLeft(m * 60); setRun(false); };
  const pct = 100 - (left / (mode * 60)) * 100;
  return (
    <div className="surface p-5" data-testid="focus-timer">
      <div className="flex justify-between items-center"><div className="eyebrow">Focus timer</div>
        <div className="flex gap-1">{[25, 5].map((m) => <button key={m} onClick={() => pick(m)} className={cn("text-xs px-2.5 py-1 rounded-lg", mode === m ? "bg-secondary font-semibold" : "text-muted-foreground")} data-testid={`focus-mode-${m}`}>{m === 25 ? "Focus" : "Break"}</button>)}</div>
      </div>
      <div className="font-mono text-5xl font-extrabold text-center my-5 tabular-nums" data-testid="focus-time">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div>
      <Progress value={pct} className="h-1.5" />
      <div className="flex gap-2 mt-4">
        <button onClick={() => setRun(!run)} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2" data-testid="focus-start-button">{run ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Start</>}</button>
        <button onClick={() => pick(mode)} className="h-10 w-10 grid place-items-center rounded-xl border border-border" data-testid="focus-reset-button" aria-label="Reset"><RotateCcw className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

const TaskCard = ({ t, move, del }) => {
  const idx = COLS.findIndex((c) => c[0] === t.status);
  const overdue = t.status !== "done" && t.due_date < isoToday();
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="surface p-3.5" data-testid={`task-card-${t.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("font-medium text-sm leading-snug", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</div>
        <button onClick={() => del(t)} className="text-muted-foreground hover:text-destructive" data-testid={`task-delete-${t.id}`} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {t.subject && <div className="text-xs text-muted-foreground mt-1 truncate">{t.subject}</div>}
      <div className="flex items-center gap-2 mt-3">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5", PRI[t.priority])}>{t.priority}</span>
        <span className={cn("font-mono text-[11px] inline-flex items-center gap-1", overdue ? "text-destructive" : "text-muted-foreground")}><CalendarClock className="h-3 w-3" />{t.due_date}</span>
        <div className="ml-auto flex gap-1">
          {idx > 0 && <button onClick={() => move(t, COLS[idx - 1][0])} className="h-7 w-7 grid place-items-center rounded-lg border border-border hover:bg-accent" data-testid={`task-back-${t.id}`} aria-label="Move back"><ChevronLeft className="h-3.5 w-3.5" /></button>}
          {idx < 2 && <button onClick={() => move(t, COLS[idx + 1][0])} className="h-7 w-7 grid place-items-center rounded-lg border border-border hover:bg-accent" data-testid={`task-forward-${t.id}`} aria-label="Move forward"><ChevronRight className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
    </motion.div>
  );
};

export default function Planner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState();
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => get("/tasks") });
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", user.dept, user.semester], queryFn: () => get("/subjects", { dept: user.dept, semester: user.semester }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const move = async (t, status) => { try { await api.patch(`/tasks/${t.id}`, { status }); refresh(); if (status === "done") toast.success("Nice work!"); } catch (e) { toast.error(errMsg(e)); } };
  const del = async (t) => { try { await api.delete(`/tasks/${t.id}`); refresh(); } catch (e) { toast.error(errMsg(e)); } };
  const shown = day ? tasks.filter((t) => t.due_date === toIso(day)) : tasks;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div data-testid="planner-page">
      <PageHeader eyebrow="Study Planner" title="Plan it. Track it. Ace it." sub="A kanban board for revision with a calendar and focus timer."
        right={<button onClick={() => setOpen(true)} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2" data-testid="planner-add-task-button"><Plus className="h-4 w-4" />New task</button>} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="surface p-4 mb-4 flex items-center gap-4" data-testid="planner-progress">
            <div className="font-mono text-2xl font-extrabold">{done}/{tasks.length}</div>
            <div className="flex-1"><div className="text-xs text-muted-foreground mb-1.5">tasks completed {day && `· filtered to ${toIso(day)}`}</div><Progress value={tasks.length ? (done / tasks.length) * 100 : 0} className="h-2" /></div>
            {day && <button onClick={() => setDay(undefined)} className="text-xs text-primary font-semibold" data-testid="planner-clear-date">Clear</button>}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {COLS.map(([k, label]) => {
              const items = shown.filter((t) => t.status === k);
              return (
                <div key={k} className="rounded-2xl bg-secondary/50 p-3 min-h-[200px]" data-testid={`planner-col-${k}`}>
                  <div className="flex justify-between items-center px-1 mb-3"><span className="eyebrow">{label}</span><span className="font-mono text-xs text-muted-foreground">{items.length}</span></div>
                  <div className="space-y-2"><AnimatePresence>{items.map((t) => <TaskCard key={t.id} t={t} move={move} del={del} />)}</AnimatePresence></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="surface p-3 flex justify-center" data-testid="planner-calendar">
            <Calendar mode="single" selected={day} onSelect={setDay} modifiers={{ task: tasks.filter((t) => t.status !== "done").map((t) => new Date(`${t.due_date}T00:00:00`)) }}
              modifiersClassNames={{ task: "!font-bold !text-primary underline decoration-2 underline-offset-4" }} />
          </div>
          <Focus />
        </div>
      </div>
      <AddTask open={open} setOpen={setOpen} subjects={subs} onSaved={refresh} />
    </div>
  );
}
