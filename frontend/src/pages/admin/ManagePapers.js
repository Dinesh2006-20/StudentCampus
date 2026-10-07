import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, get, errMsg } from "@/lib/api";
import { DeptSelect, SemSelect } from "@/components/DeptSemPicker";
import { ExamPill } from "@/components/PaperCard";

export const ManagePapers = () => {
  const qc = useQueryClient();
  const [dept, setDept] = useState("IT");
  const [sem, setSem] = useState(3);
  const [q, setQ] = useState("");
  const [del, setDel] = useState(null);
  const params = { dept, semester: sem, q: q || undefined, limit: 100, sort: "recent" };
  const { data } = useQuery({ queryKey: ["admin-papers", params], queryFn: () => get("/papers", params) });

  const confirm = async () => {
    try { await api.delete(`/admin/papers/${del.id}`); toast.success("Paper removed"); qc.invalidateQueries(); }
    catch (e) { toast.error(errMsg(e)); }
    setDel(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <DeptSelect value={dept} onChange={setDept} allowAll testid="manage-dept-select" />
        <SemSelect value={sem} onChange={setSem} allowAll testid="manage-sem-select" />
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by subject, type or year" className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-sm" data-testid="manage-search-input" /></div>
      </div>
      <div className="text-xs text-muted-foreground mb-2 font-mono">{data?.total ?? 0} papers (showing up to 100)</div>
      <div className="surface divide-y divide-border overflow-hidden" data-testid="manage-papers-list">
        {data?.items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm" data-testid={`manage-paper-${p.id}`}>
            <span className="font-mono font-extrabold stamp w-12">{p.exam_year}</span>
            <div className="flex-1 min-w-0"><div className="truncate font-medium">{p.subject_name}</div><div className="text-xs text-muted-foreground font-mono">{p.dept} · {p.subject_code} · S{p.semester} · AY {p.academic_year}</div></div>
            <ExamPill type={p.exam_type} className="hidden sm:inline-flex" />
            <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">{p.file_type}</span>
            <button onClick={() => setDel(p)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive" data-testid={`manage-delete-${p.id}`} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove this paper?</AlertDialogTitle>
          <AlertDialogDescription>{del?.subject_name} · {del?.exam_type} · {del?.exam_year} will be hidden from students.</AlertDialogDescription>
          <AlertDialogFooter><AlertDialogCancel data-testid="manage-delete-cancel">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirm} data-testid="manage-delete-confirm">Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
