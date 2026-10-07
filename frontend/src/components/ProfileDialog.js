import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeptSelect, SemSelect } from "@/components/DeptSemPicker";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export const ProfileDialog = ({ open, setOpen }) => {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({});
  useEffect(() => { if (open) setF({ name: user.name, dept: user.dept, semester: user.semester }); }, [open, user]);

  const save = async () => {
    try {
      const r = await api.put("/auth/profile", f);
      setUser(r.data); qc.invalidateQueries(); setOpen(false);
      toast.success("Profile updated");
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="profile-dialog">
        <DialogTitle className="font-display">Your academic profile</DialogTitle>
        <DialogDescription>Personalises your timetable, exams and home feed.</DialogDescription>
        <div className="space-y-4 mt-2">
          <div><Label>Name</Label><Input className="mt-1.5 h-10 rounded-xl" value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="profile-name-input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Department</Label><div className="mt-1.5"><DeptSelect value={f.dept} onChange={(v) => setF({ ...f, dept: v })} testid="profile-dept-select" /></div></div>
            <div><Label>Semester</Label><div className="mt-1.5"><SemSelect value={f.semester} onChange={(v) => setF({ ...f, semester: v })} testid="profile-sem-select" /></div></div>
          </div>
          <button onClick={save} className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold" data-testid="profile-save-button">Save changes</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
