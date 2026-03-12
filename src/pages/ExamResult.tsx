import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, CheckCircle, Home, WifiOff, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppFooter from "@/components/AppFooter";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingSubmit, clearPendingSubmit } from "@/hooks/useExamAutoSave";

const ExamResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    studentName: string;
    examTitle: string;
    offline?: boolean;
  } | null;
  const [pendingSynced, setPendingSynced] = useState(false);

  const studentName = state?.studentName || "";
  const examTitle = state?.examTitle || "";
  const offline = state?.offline || false;

  // Auto-retry pending submissions when online
  useEffect(() => {
    if (!offline) return;

    const trySync = async () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("exam_pending_submit_"));
      for (const key of keys) {
        const examId = key.replace("exam_pending_submit_", "");
        const pending = getPendingSubmit(examId);
        if (!pending || !navigator.onLine) continue;
        try {
          const { error } = await supabase.functions.invoke("submit-exam", { body: pending });
          if (!error) {
            clearPendingSubmit(examId);
            setPendingSynced(true);
          }
        } catch { /* retry next time */ }
      }
    };

    if (navigator.onLine) trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, [offline]);

  if (!state) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl border border-border text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Ujian Selesai!</h2>
        <p className="text-muted-foreground mb-1">{studentName}</p>
        <p className="text-sm text-muted-foreground mb-6">{examTitle}</p>

        {offline && !pendingSynced && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 mb-4 flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm text-foreground leading-relaxed text-left">
              Jawaban disimpan secara offline. Jawaban akan otomatis dikirim saat koneksi internet kembali.
            </p>
          </div>
        )}

        {pendingSynced && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 mb-4 flex items-center gap-3">
            <Wifi className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-foreground leading-relaxed text-left">
              Jawaban berhasil dikirim ke server!
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-6">
          <p className="text-sm text-foreground leading-relaxed">
            Jawaban Anda telah berhasil dikumpulkan. Hasil ujian akan diumumkan oleh guru/pengawas ujian.
          </p>
        </div>

        <Button onClick={() => navigate("/")} className="w-full gap-2 exam-gradient border-0 h-12 text-base">
          <Home className="h-5 w-5" /> Kembali ke Halaman Utama
        </Button>
      </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default ExamResult;
