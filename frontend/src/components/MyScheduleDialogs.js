import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errMsg } from "@/lib/api";
import { DAYS, EXAM_TYPES, isoToday } from "@/lib/campus";

const F = ({ label, ...p }) => <div><Label className="text-xs">{label}</Label><Input className="mt-1.5 h-10 rounded-xl" {...p} /></div>;
const Pick = ({ label, value, onChange, items, testid }) => (
  <div><Label className="text-xs">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent>{items.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

export const MyClassDialog = ({ open, setOpen, defaultDay, onSaved }) => {
  const [f, setF] = useState({ day: defaultDay, start: "16:00", end: "17:00", subject_name: "", room: "", kind: "Self Study" });
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/timetable/mine", f); toast.success("Added to your timetable"); setOpen(false); setF({ ...f, subject_name: "" }); onSaved(); }
    catch (x) { toast.error(errMsg(x)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="my-class-dialog">
        <DialogTitle className="font-display">Add to my timetable</DialogTitle>
        <DialogDescription>Personal slots like self-study, coaching or club activities. Only you can see these.</DialogDescription>
        <form onSubmit={save} className="space-y-3">
          <F label="Title" required value={f.subject_name} onChange={(e) => setF({ ...f, subject_name: e.target.value })} placeholder="DBMS revision" data-testid="my-class-title-input" />
          <div className="grid grid-cols-2 gap-3">
            <Pick label="Day" value={f.day} onChange={(v) => setF({ ...f, day: v })} items={DAYS} testid="my-class-day-select" />
            <Pick label="Type" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} items={["Self Study", "Coaching", "Lab Practice", "Club", "Other"]} testid="my-class-kind-select" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Start" type="time" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} data-testid="my-class-start-input" />
            <F label="End" type="time" required value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} data-testid="my-class-end-input" />
            <F label="Place" value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })} data-testid="my-class-room-input" />
          </div>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold" data-testid="my-class-save-button">Add slot</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const MyEventDialog = ({ open, setOpen, onSaved }) => {
  const [f, setF] = useState({ subject_name: "", exam_type: "Personal", date: isoToday(), start_time: "10:00", end_time: "11:00", hall: "", syllabus: "" });
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/exams/mine", { ...f, syllabus: f.syllabus.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Added to your schedule"); setOpen(false); setF({ ...f, subject_name: "", syllabus: "" }); onSaved();
    } catch (x) { toast.error(errMsg(x)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="my-event-dialog">
        <DialogTitle className="font-display">Add to my schedule</DialogTitle>
        <DialogDescription>Track your own tests, assignments, seminars or study goals with a countdown.</DialogDescription>
        <form onSubmit={save} className="space-y-3">
          <F label="Title" required value={f.subject_name} onChange={(e) => setF({ ...f, subject_name: e.target.value })} placeholder="DBMS assignment submission" data-testid="my-event-title-input" />
          <div className="grid grid-cols-2 gap-3">
            <Pick label="Type" value={f.exam_type} onChange={(v) => setF({ ...f, exam_type: v })} items={["Personal", "Assignment", "Lab Test", "Seminar", ...EXAM_TYPES]} testid="my-event-type-select" />
            <F label="Date" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} data-testid="my-event-date-input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <F label="Start" type="time" required value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} data-testid="my-event-start-input" />
            <F label="End" type="time" required value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} data-testid="my-event-end-input" />
            <F label="Place" value={f.hall} onChange={(e) => setF({ ...f, hall: e.target.value })} data-testid="my-event-place-input" />
          </div>
          <F label="Topics (comma separated)" value={f.syllabus} onChange={(e) => setF({ ...f, syllabus: e.target.value })} placeholder="Unit I, Normalization" data-testid="my-event-topics-input" />
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold" data-testid="my-event-save-button">Add to schedule</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
