import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { changelog, CURRENT_VERSION, type ChangelogEntry } from "@/data/changelog";

const STORAGE_KEY = "exon_last_seen_version";

interface WhatsNewDialogProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const WhatsNewDialog = ({ externalOpen, onExternalClose }: WhatsNewDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const [expandedAll, setExpandedAll] = useState(true);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== CURRENT_VERSION) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (externalOpen) setOpen(true);
  }, [externalOpen]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setOpen(false);
    onExternalClose?.();
  };

  const latestEntry = changelog[changelog.length - 1];
  const olderEntries = [...changelog].reverse().slice(1);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">What's New</DialogTitle>
              <p className="text-sm text-muted-foreground">Pembaruan terbaru aplikasi</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Latest version - always expanded */}
          <VersionBlock entry={latestEntry} isLatest />

          {/* Older versions */}
          {olderEntries.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setExpandedAll(!expandedAll)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                {expandedAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Riwayat versi sebelumnya ({olderEntries.length})
              </button>

              {expandedAll && (
                <div className="space-y-4">
                  {olderEntries.map((entry) => (
                    <VersionBlock key={entry.version} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <Button onClick={handleClose} className="w-full exam-gradient border-0">
            Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const VersionBlock = ({ entry, isLatest = false }: { entry: ChangelogEntry; isLatest?: boolean }) => {
  const formattedDate = new Date(entry.date).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={`rounded-xl border p-4 ${isLatest ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={isLatest ? "default" : "secondary"} className="text-xs">
          v{entry.version}
        </Badge>
        {isLatest && (
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            Terbaru
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{formattedDate}</span>
      </div>
      <h4 className="font-semibold text-foreground text-sm mb-2">{entry.title}</h4>
      <ul className="space-y-1">
        {entry.changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>{change}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WhatsNewDialog;
