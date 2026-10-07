import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPTS, ordinal } from "@/lib/campus";

export const DeptSelect = ({ value, onChange, testid = "dept-select", allowAll }) => (
  <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
    <SelectTrigger className="h-10 rounded-xl min-w-[130px]" data-testid={testid}><SelectValue placeholder="Department" /></SelectTrigger>
    <SelectContent>
      {allowAll && <SelectItem value="all">All departments</SelectItem>}
      {DEPTS.map((d) => <SelectItem key={d.code} value={d.code}>{d.code} · {d.name}</SelectItem>)}
    </SelectContent>
  </Select>
);

export const SemSelect = ({ value, onChange, testid = "sem-select", allowAll, sems = [1, 2, 3, 4, 5, 6, 7, 8] }) => (
  <Select value={value ? String(value) : "all"} onValueChange={(v) => onChange(v === "all" ? "" : Number(v))}>
    <SelectTrigger className="h-10 rounded-xl min-w-[120px]" data-testid={testid}><SelectValue placeholder="Semester" /></SelectTrigger>
    <SelectContent>
      {allowAll && <SelectItem value="all">All semesters</SelectItem>}
      {sems.map((s) => <SelectItem key={s} value={String(s)}>{ordinal(s)} Semester</SelectItem>)}
    </SelectContent>
  </Select>
);

export const DeptSemPicker = ({ dept, sem, onDept, onSem }) => (
  <div className="flex gap-2 flex-wrap">
    <DeptSelect value={dept} onChange={onDept} />
    <SemSelect value={sem} onChange={onSem} />
  </div>
);
