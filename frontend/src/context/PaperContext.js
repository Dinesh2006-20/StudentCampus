import { createContext, useContext, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, get, downloadPaper, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PaperPreview } from "@/components/PaperPreview";

const Ctx = createContext(null);

export const PaperProvider = ({ children }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [previewId, setPreviewId] = useState(null);
  const recentKey = `sc_recent_${user?.id}`;
  const [recent, setRecent] = useState(() => JSON.parse(localStorage.getItem(recentKey) || "[]"));
  const { data: saved = [] } = useQuery({ queryKey: ["bookmarks"], queryFn: () => get("/bookmarks") });
  const savedIds = new Set(saved.map((p) => p.id));

  const toggleSave = useCallback(async (p) => {
    try {
      const r = await api.post(`/bookmarks/${p.id}`);
      toast.success(r.data.bookmarked ? "Saved to your library" : "Removed from library");
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) { toast.error(errMsg(e)); }
  }, [qc]);

  const download = useCallback(async (p) => {
    const t = toast.loading(`Preparing ${p.subject_code} · ${p.exam_year}`);
    try { await downloadPaper(p); toast.success("Download started", { id: t }); }
    catch (e) { toast.error(errMsg(e), { id: t }); }
  }, []);

  const preview = useCallback((p) => {
    setPreviewId(p.id);
    setRecent((r) => {
      const next = [p, ...r.filter((x) => x.id !== p.id)].slice(0, 8);
      localStorage.setItem(recentKey, JSON.stringify(next));
      return next;
    });
  }, [recentKey]);

  return (
    <Ctx.Provider value={{ savedIds, saved, toggleSave, download, preview, recent }}>
      {children}
      <PaperPreview paperId={previewId} onClose={() => setPreviewId(null)} onSwitch={preview} />
    </Ctx.Provider>
  );
};

export const usePapers = () => useContext(Ctx);
