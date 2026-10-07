import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { get } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { UploadPaper } from "@/pages/admin/UploadPaper";
import { ManagePapers } from "@/pages/admin/ManagePapers";
import { ManageTimetable, ManageExams } from "@/pages/admin/ManageSchedule";
import { ManageSubjects } from "@/pages/admin/ManageSubjects";

export default function Admin() {
  const { data: s } = useQuery({ queryKey: ["admin-stats"], queryFn: () => get("/admin/stats") });
  const stats = [["Papers", s?.papers], ["Uploaded files", s?.uploaded], ["Subjects", s?.subjects], ["Students", s?.students], ["Scheduled exams", s?.exams]];
  return (
    <div data-testid="admin-page">
      <PageHeader eyebrow="Admin Studio" title="Curate the archive" sub="Upload papers, manage subjects, timetables and exam schedules." />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {stats.map(([l, v]) => (
          <div key={l} className="surface p-4" data-testid={`admin-stat-${l.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="font-mono text-2xl font-extrabold">{v?.toLocaleString() ?? "–"}</div><div className="text-xs text-muted-foreground mt-1">{l}</div>
          </div>
        ))}
      </div>
      <Tabs defaultValue="upload">
        <TabsList className="h-auto p-1 rounded-2xl flex-wrap justify-start">
          {[["upload", "Upload paper"], ["papers", "Manage papers"], ["timetable", "Timetable"], ["exams", "Exam schedule"], ["subjects", "Subjects"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="rounded-xl px-4 py-2" data-testid={`admin-tab-${v}`}>{l}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="upload" className="mt-6"><UploadPaper recent={s?.recent_uploads || []} /></TabsContent>
        <TabsContent value="papers" className="mt-6"><ManagePapers /></TabsContent>
        <TabsContent value="timetable" className="mt-6"><ManageTimetable /></TabsContent>
        <TabsContent value="exams" className="mt-6"><ManageExams /></TabsContent>
        <TabsContent value="subjects" className="mt-6"><ManageSubjects /></TabsContent>
      </Tabs>
    </div>
  );
}
