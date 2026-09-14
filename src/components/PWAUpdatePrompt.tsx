import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

/**
 * Menampilkan notifikasi non-blocking saat service worker mendeteksi versi baru.
 * - Tidak pernah reload otomatis (registerType: "prompt").
 * - Notifikasi ditunda selama siswa berada di halaman ujian (/exam).
 * - Reload hanya mengaktifkan SW baru; storage/sesi/draft tidak disentuh.
 */
const PWAUpdatePrompt = () => {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Periksa update secara berkala (tanpa reload)
      const check = () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      };
      const id = window.setInterval(check, 60 * 60 * 1000);
      return () => window.clearInterval(id);
    },
  });

  // Tunda notifikasi selama ujian berlangsung
  const isExamActive = location.pathname.startsWith("/exam");

  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  if (!needRefresh || dismissed || isExamActive || reloading) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[9997] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Versi baru EXON tersedia</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Muat ulang untuk memakai versi terbaru. Data ujian dan sesi login tetap aman.
          </p>
          <Button
            size="sm"
            className="mt-3 h-8 text-xs"
            onClick={() => {
              setReloading(true);
              updateServiceWorker(true);
            }}
          >
            Muat Ulang
          </Button>
        </div>
        <button
          aria-label="Tutup"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
