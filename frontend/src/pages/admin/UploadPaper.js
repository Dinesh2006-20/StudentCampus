import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { api, get, errMsg } from "@/lib/api";
import { DeptSelect, SemSelect } from "@/components/DeptSemPicker";
import { PaperCard } from "@/components/PaperCard";
import { EXAM_TYPES, ordinal, semsOfYear, academicYearOf } from "@/lib/campus";

const CUR = new Date().getFullYear();
const YEARS = Array.from({ length: CUR - 1989 }, (_, i) => CUR - i);

const Pick = ({ label, value, onChange, items, testid, placeholder }) => (
  <div><Label className="text-xs">{label}</Label>
    <Select value={value ? String(value) : undefined} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5 h-10 rounded-xl" data-testid={testid}><SelectValue placeholder={placeholder || "Select"} /></SelectTrigger>
      <SelectContent>{items.map(([v, l]) => <SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

export const UploadPaper = ({ recent }) => {
  const qc = useQueryClient();
  const input = useRef(null);
  const [f, setF] = useState({ dept: "IT", year: 2, semester: 3, subject_code: "", exam_type: "Internal 1", exam_year: CUR, academic_year: "", regulation: "", has_solution: false });
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [prog, setProg] = useState(null);
  const { data: subs = [] } = useQuery({ queryKey: ["subjects", f.dept, f.semester], queryFn: () => get("/subjects", { dept: f.dept, semester: f.semester }) });
  const ay = f.academic_year || academicYearOf(f.semester, f.exam_year);

  const pickFile = (fl) => {
    if (!fl) return;
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(fl.name)) return toast.error("Only PDF, PNG, JPG or WEBP");
    if (fl.size > 20 * 1024 * 1024) return toast.error("Max file size is 20MB");
    setFile(fl);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Attach the question paper file");
    if (!f.subject_code) return toast.error("Choose a subject");
    const fd = new FormData();
    fd.append("file", file);
    ["dept", "semester", "subject_code", "exam_type", "exam_year", "regulation"].forEach((k) => f[k] !== "" && fd.append(k, f[k]));
    fd.append("academic_year", ay);
    fd.append("has_solution", f.has_solution);
    setProg(0);
    try {
      await api.post("/admin/papers", fd, { onUploadProgress: (p) => setProg(Math.round((p.loaded / (p.total || 1)) * 100)) });
      toast.success(`Uploaded ${f.subject_code} · ${f.exam_type} · ${f.exam_year}`);
      setFile(null);
      qc.invalidateQueries();
    } catch (x) { toast.error(errMsg(x)); }
    finally { setProg(null); }
  };

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
      <form onSubmit={submit} className="surface p-5 sm:p-6 space-y-5" data-testid="admin-upload-form">
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Department</Label><div className="mt-1.5"><DeptSelect value={f.dept} onChange={(v) => setF({ ...f, dept: v, subject_code: "" })} testid="upload-dept-select" /></div></div>
          <Pick label="Class / Year" value={f.year} onChange={(v) => setF({ ...f, year: +v, semester: semsOfYear(+v)[0], subject_code: "" })} items={[1, 2, 3, 4].map((y) => [y, `${ordinal(y)} Year`])} testid="upload-year-select" />
          <div><Label className="text-xs">Semester</Label><div className="mt-1.5"><SemSelect value={f.semester} sems={semsOfYear(f.year)} onChange={(v) => setF({ ...f, semester: v, subject_code: "" })} testid="upload-sem-select" /></div></div>
        </div>
        <Pick label="Subject" value={f.subject_code} onChange={(v) => setF({ ...f, subject_code: v })} items={subs.map((s) => [s.code, `${s.code} · ${s.name}`])} placeholder="Choose subject" testid="upload-subject-select" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Pick label="Exam type" value={f.exam_type} onChange={(v) => setF({ ...f, exam_type: v })} items={EXAM_TYPES.map((t) => [t, t])} testid="upload-exam-type-select" />
          <Pick label="Exam year" value={f.exam_year} onChange={(v) => setF({ ...f, exam_year: +v, academic_year: "" })} items={YEARS.map((y) => [y, y])} testid="upload-exam-year-select" />
          <div><Label className="text-xs">Academic year</Label><Input className="mt-1.5 h-10 rounded-xl font-mono" value={ay} onChange={(e) => setF({ ...f, academic_year: e.target.value })} data-testid="upload-academic-year-input" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <div><Label className="text-xs">Regulation (optional)</Label><Input className="mt-1.5 h-10 rounded-xl" placeholder={f.exam_year >= 2021 ? "R2021" : "R2017"} value={f.regulation} onChange={(e) => setF({ ...f, regulation: e.target.value })} data-testid="upload-regulation-input" /></div>
          <label className="flex items-center gap-3 h-10"><Switch checked={f.has_solution} onCheckedChange={(v) => setF({ ...f, has_solution: v })} data-testid="upload-solution-switch" /><span className="text-sm">Answer key included</span></label>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}
          onClick={() => input.current?.click()} data-testid="admin-upload-dropzone"
          className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
          <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => pickFile(e.target.files[0])} data-testid="admin-paper-file-input" />
          {file ? (
            <div className="flex items-center justify-center gap-3"><FileText className="h-6 w-6 text-primary" /><span className="font-medium truncate max-w-[220px]">{file.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} data-testid="upload-remove-file"><X className="h-4 w-4" /></button></div>
          ) : (<><UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" /><div className="font-semibold mt-2">Drop the paper here or click to browse</div><div className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, WEBP · max 20MB</div></>)}
        </div>
        {prog != null && <Progress value={prog} className="h-1.5" />}
        <button disabled={prog != null} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="admin-upload-paper-button">
          {prog != null ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}Publish paper
        </button>
      </form>
      <div>
        <div className="eyebrow mb-3">Recently uploaded</div>
        {recent.length === 0 ? <div className="text-sm text-muted-foreground surface p-6">No uploaded files yet.</div>
          : <div className="space-y-3">{recent.slice(0, 4).map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}</div>}
      </div>
    </div>
  );
};
