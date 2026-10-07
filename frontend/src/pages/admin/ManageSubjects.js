import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, get, errMsg } from "@/lib/api";
import { DeptSemPicker } from "@/components/DeptSemPicker";

export const ManageSubjects = () => {
  const qc = useQueryClient();
  const [dept, setDept] = useState("IT");
  const [sem, setSem] = useState(3);
  const [f, setF] = useState({ code: "", name: "", is_lab: false });
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", dept, sem], queryFn: () => get("/subjects", { dept, semester: sem }) });
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/subjects", { ...f, dept, semester: sem }); toast.success("Subject added"); setF({ code: "", name: "", is_lab: false }); qc.invalidateQueries({ queryKey: ["subjects"] }); qc.invalidateQueries({ queryKey: ["meta"] }); }
    catch (x) { toast.error(errMsg(x)); }
  };
  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
      <div className="space-y-4">
        <DeptSemPicker dept={dept} sem={sem} onDept={setDept} onSem={setSem} />
        <form onSubmit={add} className="surface p-5 space-y-3" data-testid="admin-subject-form">
          <div><Label className="text-xs">Subject code</Label><Input required className="mt-1.5 h-10 rounded-xl font-mono uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} data-testid="subject-code-input" /></div>
          <div><Label className="text-xs">Subject name</Label><Input required className="mt-1.5 h-10 rounded-xl" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="subject-name-input" /></div>
          <label className="flex items-center gap-3"><Switch checked={f.is_lab} onCheckedChange={(v) => setF({ ...f, is_lab: v })} data-testid="subject-lab-switch" /><span className="text-sm">Laboratory subject</span></label>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2" data-testid="subject-add-button"><Plus className="h-4 w-4" />Add subject</button>
        </form>
      </div>
      <div className="surface divide-y divide-border overflow-hidden">
        {subs.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm" data-testid={`subject-row-${s.code.toLowerCase()}`}>
            <span className="font-mono text-xs w-16 font-semibold">{s.code}</span><span className="flex-1">{s.name}</span>
            {s.is_lab && <FlaskConical className="h-4 w-4 text-emerald-500" />}<span className="font-mono text-xs text-muted-foreground">{s.papers} papers</span>
          </div>
        ))}
      </div>
    </div>
  );
};
