import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, Award, AlertTriangle, GraduationCap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, get, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Empty } from "@/components/PageHeader";
import { SemSelect } from "@/components/DeptSemPicker";
import { EXAM_TYPES } from "@/lib/campus";

const pct = (m) => (m.score / m.max_score) * 100;
const avg = (a) => (a.length ? a.reduce((s, m) => s + pct(m), 0) / a.length : 0);
const color = (v) => (v >= 80 ? "hsl(var(--chart-2))" : v >= 60 ? "hsl(var(--chart-1))" : "hsl(var(--chart-5))");

const AddMark = ({ open, setOpen, user, onSaved }) => {
  const [sem, setSem] = useState(user.semester);
  const [f, setF] = useState({ subject_code: "", exam_type: "Internal 1", score: "", max_score: 50 });
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", user.dept, sem], queryFn: () => get("/subjects", { dept: user.dept, semester: sem }), enabled: open });
  const save = async (e) => {
    e.preventDefault();
    const s = subs.find((x) => x.code === f.subject_code);
    if (!s) return toast.error("Pick a subject");
    try { await api.post("/marks", { ...f, semester: sem, subject_name: s.name, score: +f.score, max_score: +f.max_score }); toast.success("Score added"); setOpen(false); onSaved(); }
    catch (x) { toast.error(errMsg(x)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="mark-dialog">
        <DialogTitle className="font-display">Add exam score</DialogTitle>
        <DialogDescription>Log internal, model or semester marks to track progress.</DialogDescription>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Semester</Label><div className="mt-1.5"><SemSelect value={sem} onChange={(v) => { setSem(v); setF({ ...f, subject_code: "" }); }} testid="mark-sem-select" /></div></div>
            <div><Label>Exam</Label>
              <Select value={f.exam_type} onValueChange={(v) => setF({ ...f, exam_type: v, max_score: v.startsWith("Internal") ? 50 : 100 })}>
                <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid="mark-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Subject</Label>
            <Select value={f.subject_code} onValueChange={(v) => setF({ ...f, subject_code: v })}>
              <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid="mark-subject-select"><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.code}>{s.code} · {s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Score</Label><Input type="number" step="0.5" min="0" required className="mt-1.5 h-10 rounded-xl" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} data-testid="mark-score-input" /></div>
            <div><Label>Out of</Label><Input type="number" min="1" required className="mt-1.5 h-10 rounded-xl" value={f.max_score} onChange={(e) => setF({ ...f, max_score: e.target.value })} data-testid="mark-max-input" /></div>
          </div>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold" data-testid="mark-save-button">Save score</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ icon: Icon, label, value, sub, testid }) => (
  <div className="surface p-5" data-testid={testid}>
    <Icon className="h-5 w-5 text-muted-foreground" />
    <div className="font-mono text-2xl sm:text-3xl font-extrabold mt-3 truncate">{value}</div>
    <div className="text-xs text-muted-foreground mt-1 truncate">{label}{sub && ` · ${sub}`}</div>
  </div>
);

export default function ProgressPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: marks = [] } = useQuery({ queryKey: ["marks"], queryFn: () => get("/marks") });
  const sems = [...new Set(marks.map((m) => m.semester))].sort((a, b) => a - b);
  const [sem, setSem] = useState("");
  const activeSem = sem || sems[sems.length - 1];
  const refresh = () => { qc.invalidateQueries({ queryKey: ["marks"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const del = async (m) => { try { await api.delete(`/marks/${m.id}`); refresh(); } catch (e) { toast.error(errMsg(e)); } };

  const { overall, bySubject, trend, best, worst } = useMemo(() => {
    const semMarks = marks.filter((m) => m.semester === activeSem);
    const g = {};
    semMarks.forEach((m) => (g[m.subject_code] ||= { code: m.subject_code, name: m.subject_name, items: [] }).items.push(m));
    const bySubject = Object.values(g).map((s) => ({ ...s, value: +avg(s.items).toFixed(1) }));
    const sorted = [...bySubject].sort((a, b) => b.value - a.value);
    return {
      overall: avg(marks), bySubject,
      trend: sems.map((s) => ({ sem: `S${s}`, value: +avg(marks.filter((m) => m.semester === s)).toFixed(1) })),
      best: sorted[0], worst: sorted[sorted.length - 1],
    };
  }, [marks, activeSem, sems]);

  return (
    <div data-testid="progress-page">
      <PageHeader eyebrow="Student Progress" title="Know where you stand" sub="Scores, trends and the subjects that need your attention."
        right={<button onClick={() => setOpen(true)} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2" data-testid="progress-add-mark-button"><Plus className="h-4 w-4" />Add score</button>} />
      {marks.length === 0 ? <Empty icon={GraduationCap} title="No scores yet" sub="Add your first internal or semester score to see analytics." /> : (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Stat icon={TrendingUp} label="Overall average" value={`${overall.toFixed(1)}%`} testid="progress-overall" />
          <Stat icon={GraduationCap} label="Est. CGPA (÷9.5)" value={Math.min(10, overall / 9.5).toFixed(2)} testid="progress-cgpa" />
          <Stat icon={Award} label="Strongest" value={best?.value != null ? `${best.value}%` : "–"} sub={best?.name} testid="progress-best" />
          <Stat icon={AlertTriangle} label="Needs attention" value={worst?.value != null ? `${worst.value}%` : "–"} sub={worst?.name} testid="progress-worst" />
        </div>
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 mt-4">
          <div className="surface p-5" data-testid="progress-subject-chart">
            <div className="flex justify-between items-center mb-4"><div className="eyebrow">Subject performance</div><SemSelect value={activeSem} onChange={setSem} sems={sems} testid="progress-sem-select" /></div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bySubject} margin={{ left: -20 }}>
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v) => [`${v}%`, "Avg"]} labelFormatter={(c) => bySubject.find((s) => s.code === c)?.name} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>{bySubject.map((s) => <Cell key={s.code} fill={color(s.value)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="surface p-5" data-testid="progress-trend-chart">
            <div className="eyebrow mb-4">Semester trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sem" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface mt-4 overflow-hidden" data-testid="progress-marks-list">
          <div className="p-5 pb-3 eyebrow">All scores</div>
          <div className="divide-y divide-border">
            {[...marks].reverse().map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center gap-3 text-sm" data-testid={`mark-row-${m.id}`}>
                <span className="font-mono text-xs text-muted-foreground w-12">S{m.semester}</span>
                <div className="flex-1 min-w-0"><div className="truncate font-medium">{m.subject_name}</div><div className="text-xs text-muted-foreground">{m.exam_type}</div></div>
                <span className="font-mono font-bold" style={{ color: color(pct(m)) }}>{m.score}/{m.max_score}</span>
                <button onClick={() => del(m)} className="text-muted-foreground hover:text-destructive" data-testid={`mark-delete-${m.id}`} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </>)}
      <AddMark open={open} setOpen={setOpen} user={user} onSaved={refresh} />
    </div>
  );
}
