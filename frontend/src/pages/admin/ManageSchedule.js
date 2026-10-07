import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, get, errMsg } from "@/lib/api";
import { DeptSemPicker } from "@/components/DeptSemPicker";
import { ExamPill } from "@/components/PaperCard";
import { DAYS, EXAM_TYPES } from "@/lib/campus";

const Pick = ({ label, value, onChange, items, testid }) => (
  <div><Label className="text-xs">{label}</Label>
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid={testid}><SelectValue placeholder="Select" /></SelectTrigger>
      <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);
const F = ({ label, ...p }) => <div><Label className="text-xs">{label}</Label><Input className="mt-1.5 h-10 rounded-xl" {...p} /></div>;

const useScope = () => {
  const [dept, setDept] = useState("IT");
  const [sem, setSem] = useState(3);
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", dept, sem], queryFn: () => get("/subjects", { dept, semester: sem }) });
  return { dept, sem, setDept, setSem, subs };
};

const Shell = ({ scope, form, children }) => (
  <div className="grid lg:grid-cols-[380px_1fr] gap-6">
    <div className="space-y-4">
      <DeptSemPicker dept={scope.dept} sem={scope.sem} onDept={scope.setDept} onSem={scope.setSem} />
      {form}
    </div>
    <div className="surface divide-y divide-border overflow-hidden max-h-[640px] overflow-y-auto">{children}</div>
  </div>
);

export const ManageTimetable = () => {
  const qc = useQueryClient();
  const s = useScope();
  const [f, setF] = useState({ day: "Monday", start: "09:00", end: "09:50", subject_code: "", room: "", faculty: "", kind: "Lecture" });
  const { data = [] } = useQuery({ queryKey: ["timetable", s.dept, s.sem], queryFn: () => get("/timetable", { dept: s.dept, semester: s.sem }) });
  const add = async (e) => {
    e.preventDefault();
    const sub = s.subs.find((x) => x.code === f.subject_code);
    if (!sub) return toast.error("Choose a subject");
    try { await api.post("/admin/timetable", { ...f, dept: s.dept, semester: s.sem, subject_name: sub.name }); toast.success("Period added"); qc.invalidateQueries({ queryKey: ["timetable"] }); }
    catch (x) { toast.error(errMsg(x)); }
  };
  const del = async (id) => { await api.delete(`/admin/timetable/${id}`).catch((e) => toast.error(errMsg(e))); qc.invalidateQueries({ queryKey: ["timetable"] }); };
  const rows = DAYS.flatMap((d) => data.filter((x) => x.day === d));
  return (
    <Shell scope={s} form={
      <form onSubmit={add} className="surface p-5 space-y-3" data-testid="admin-timetable-form">
        <div className="grid grid-cols-2 gap-3">
          <Pick label="Day" value={f.day} onChange={(v) => setF({ ...f, day: v })} items={DAYS.map((d) => [d, d])} testid="tt-day-select" />
          <Pick label="Type" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} items={["Lecture", "Lab", "Tutorial"].map((d) => [d, d])} testid="tt-kind-select" />
        </div>
        <Pick label="Subject" value={f.subject_code} onChange={(v) => setF({ ...f, subject_code: v })} items={s.subs.map((x) => [x.code, `${x.code} · ${x.name}`])} testid="tt-subject-select" />
        <div className="grid grid-cols-2 gap-3"><F label="Start" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} data-testid="tt-start-input" /><F label="End" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} data-testid="tt-end-input" /></div>
        <div className="grid grid-cols-2 gap-3"><F label="Room" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} data-testid="tt-room-input" /><F label="Faculty" value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value })} data-testid="tt-faculty-input" /></div>
        <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2" data-testid="tt-add-button"><Plus className="h-4 w-4" />Add period</button>
      </form>}>
      {rows.map((x) => (
        <div key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" data-testid={`tt-row-${x.id}`}>
          <span className="w-10 font-semibold">{x.day.slice(0, 3)}</span><span className="font-mono text-xs text-muted-foreground w-24">{x.start}–{x.end}</span>
          <span className="flex-1 truncate">{x.subject_name}</span><span className="text-xs text-muted-foreground hidden sm:inline">{x.room}</span>
          <button onClick={() => del(x.id)} className="hover:text-destructive" data-testid={`tt-delete-${x.id}`} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </Shell>
  );
};

export const ManageExams = () => {
  const qc = useQueryClient();
  const s = useScope();
  const [f, setF] = useState({ subject_code: "", exam_type: "Internal 1", date: "", start_time: "10:00", end_time: "11:30", hall: "", syllabus: "" });
  const { data = [] } = useQuery({ queryKey: ["exams", s.dept, s.sem], queryFn: () => get("/exams", { dept: s.dept, semester: s.sem }) });
  const add = async (e) => {
    e.preventDefault();
    const sub = s.subs.find((x) => x.code === f.subject_code);
    if (!sub || !f.date) return toast.error("Choose a subject and date");
    try {
      await api.post("/admin/exams", { ...f, dept: s.dept, semester: s.sem, subject_name: sub.name, syllabus: f.syllabus.split(",").map((x) => x.trim()).filter(Boolean) });
      toast.success("Exam scheduled"); qc.invalidateQueries({ queryKey: ["exams"] }); qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (x) { toast.error(errMsg(x)); }
  };
  const del = async (id) => { await api.delete(`/admin/exams/${id}`).catch((e) => toast.error(errMsg(e))); qc.invalidateQueries({ queryKey: ["exams"] }); };
  return (
    <Shell scope={s} form={
      <form onSubmit={add} className="surface p-5 space-y-3" data-testid="admin-exam-form">
        <Pick label="Subject" value={f.subject_code} onChange={(v) => setF({ ...f, subject_code: v })} items={s.subs.map((x) => [x.code, `${x.code} · ${x.name}`])} testid="exam-subject-select" />
        <div className="grid grid-cols-2 gap-3">
          <Pick label="Exam type" value={f.exam_type} onChange={(v) => setF({ ...f, exam_type: v })} items={EXAM_TYPES.map((t) => [t, t])} testid="exam-type-select" />
          <F label="Date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} data-testid="exam-date-input" />
        </div>
        <div className="grid grid-cols-3 gap-3"><F label="Start" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} data-testid="exam-start-input" /><F label="End" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} data-testid="exam-end-input" /><F label="Hall" value={f.hall} onChange={(e) => setF({ ...f, hall: e.target.value })} data-testid="exam-hall-input" /></div>
        <F label="Syllabus (comma separated)" placeholder="Unit I, Unit II" value={f.syllabus} onChange={(e) => setF({ ...f, syllabus: e.target.value })} data-testid="exam-syllabus-input" />
        <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2" data-testid="exam-add-button"><Plus className="h-4 w-4" />Schedule exam</button>
      </form>}>
      {data.map((x) => (
        <div key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-sm" data-testid={`exam-admin-row-${x.id}`}>
          <span className="font-mono text-xs w-24">{x.date}</span><ExamPill type={x.exam_type} className="hidden sm:inline-flex" />
          <span className="flex-1 truncate">{x.subject_name}</span>
          <button onClick={() => del(x.id)} className="hover:text-destructive" data-testid={`exam-delete-${x.id}`} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </Shell>
  );
};
