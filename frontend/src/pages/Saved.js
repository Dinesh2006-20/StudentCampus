import { Bookmark } from "lucide-react";
import { usePapers } from "@/context/PaperContext";
import { PaperCard } from "@/components/PaperCard";
import { PageHeader, Empty } from "@/components/PageHeader";

export default function Saved() {
  const { saved } = usePapers();
  return (
    <div data-testid="saved-page">
      <PageHeader eyebrow="Your library" title="Saved papers" sub="Bookmarked question papers for quick revision." />
      {saved.length === 0 ? <Empty icon={Bookmark} title="No saved papers yet" sub="Tap the bookmark on any paper to keep it here." />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{saved.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}</div>}
    </div>
  );
}
