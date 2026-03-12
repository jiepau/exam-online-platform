import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ChevronLeft, ChevronRight, Send, Shield, Maximize, AlertTriangle, LayoutGrid, CloudOff, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ExamTimer from "@/components/exam/ExamTimer";
import QuestionCard from "@/components/exam/QuestionCard";
import QuestionNav from "@/components/exam/QuestionNav";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import ViolationOverlay from "@/components/exam/ViolationOverlay";
import { useExamAutoSave, cacheQuestions, loadCachedQuestions, savePendingSubmit, clearPendingSubmit, getPendingSubmit } from "@/hooks/useExamAutoSave";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface DBQuestion {
  id: string;
  question_text: string;
  options: string[];
  sort_order: number;
  image_url?: string;
  question_type?: string;
}

const ExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    studentName: string;
    examId: string;
    examTitle: string;
    examSubject: string;
    examDuration: number;
  } | null;

  const [questions, setQuestions] = useState<DBQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | number[] | string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [loadingQ, setLoadingQ] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Auto-save hook (offline-first)
  const { updateState, saveNow, loadDraft, clearDraft, syncStatus } = useExamAutoSave(state?.examId, examStarted);

  const studentName = state?.studentName || "Siswa";
  const examTitle = state?.examTitle || "";
  const examSubject = state?.examSubject || "";
  const examDuration = state?.examDuration || 60;
  const question = questions[currentIndex];

  useEffect(() => {
    if (!state?.examId) {
      navigate("/");
      return;
    }
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from("questions_student" as any)
        .select("id, exam_id, question_text, options, sort_order, image_url, question_type")
        .eq("exam_id", state.examId)
        .order("sort_order");
      let qs: DBQuestion[] = [];
      if (data && data.length > 0) {
        qs = data.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: q.options as string[],
          sort_order: q.sort_order,
          image_url: q.image_url || undefined,
          question_type: q.question_type || "multiple_choice",
        }));
        // Cache questions locally for offline use
        cacheQuestions(state.examId, qs);
      } else {
        // Offline fallback: load from cache
        const cached = loadCachedQuestions(state.examId);
        if (cached) qs = cached;
      }

      if (qs.length > 0) {
        setQuestions(qs);
        // Load saved draft after questions are ready
        const draft = await loadDraft();
        if (draft && Object.keys(draft.answers).length > 0) {
          setAnswers(draft.answers);
          setFlagged(new Set(draft.flagged));
          setCurrentIndex(draft.currentIndex);
          setDraftLoaded(true);
        }
      }
      setLoadingQ(false);
    };
    fetchQuestions();
  }, [state, navigate, loadDraft]);

  // Keep auto-save state in sync
  useEffect(() => {
    updateState({ answers, flagged, currentIndex });
  }, [answers, flagged, currentIndex, updateState]);

  const handleSubmitFn = useCallback(async () => {
    await saveNow();

    const submitPayload = {
      exam_id: state?.examId,
      answers,
      flagged_indices: Array.from(flagged),
    };

    try {
      if (!navigator.onLine) {
        // Save submission for later sync
        savePendingSubmit(state?.examId || "", submitPayload);
        await clearDraft();
        navigate("/result", {
          state: { studentName, examTitle, offline: true },
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("submit-exam", {
        body: submitPayload,
      });

      if (error) {
        console.error("Failed to submit exam:", error);
        // Save for retry
        savePendingSubmit(state?.examId || "", submitPayload);
      } else {
        clearPendingSubmit(state?.examId || "");
      }

      await clearDraft();

      navigate("/result", {
        state: { studentName, examTitle },
      });
    } catch (e) {
      console.error("Failed to submit exam:", e);
      savePendingSubmit(state?.examId || "", submitPayload);
      await clearDraft();
      navigate("/result", {
        state: { studentName, examTitle, offline: true },
      });
    }
  }, [answers, questions, navigate, studentName, examTitle, state, flagged, saveNow, clearDraft]);

  // Anti-cheat
  const { violations, isFullscreen, enterFullscreen, maxViolations, lastViolationType } = useAntiCheat(
    examStarted,
    {
      maxViolations: 5,
      onViolation: async (type, count) => {
        // Log violation to database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && state?.examId) {
            await supabase.from("violation_logs" as any).insert({
              student_id: user.id,
              exam_id: state.examId,
              violation_type: type,
              violation_count: count,
              student_name: studentName,
            });
          }
        } catch (e) {
          console.error("Failed to log violation:", e);
        }
      },
      onMaxViolations: () => {
        handleSubmitFn();
      },
    }
  );

  const handleAnswer = (value: number | number[] | string) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const handleSubmit = handleSubmitFn;

  const handleTimeUp = useCallback(() => {
    handleSubmitFn();
  }, [handleSubmitFn]);

  const [studentProfile, setStudentProfile] = useState<{
    full_name: string;
    nisn: string | null;
    exam_number: string | null;
    class_name: string;
    room_name: string;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch student detail for confirmation screen
  useEffect(() => {
    if (!state?.examId) return;
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, nisn, exam_number, class_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;

      let className = "-";
      if (profile.class_id) {
        const { data: cls } = await supabase.from("classes").select("name").eq("id", profile.class_id).maybeSingle();
        if (cls) className = cls.name;
      }

      let roomName = "-";
      const { data: roomAssign } = await supabase
        .from("student_room_assignments")
        .select("room_id")
        .eq("student_id", user.id)
        .maybeSingle();
      if (roomAssign) {
        const { data: room } = await supabase.from("rooms").select("name").eq("id", roomAssign.room_id).maybeSingle();
        if (room) roomName = room.name;
      }

      setStudentProfile({
        full_name: profile.full_name,
        nisn: profile.nisn,
        exam_number: (profile as any).exam_number,
        class_name: className,
        room_name: roomName,
      });
      setShowConfirm(true);
    };
    fetchProfile();
  }, [state]);

  const handleStartExam = async () => {
    await enterFullscreen();
    setExamStarted(true);
  };

  if (!state) return null;

  if (loadingQ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuat soal ujian...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-muted-foreground gap-4">
        <p>Belum ada soal untuk ujian ini.</p>
        <Button onClick={() => navigate("/")} variant="outline">Kembali</Button>
      </div>
    );
  }

  // Student detail confirmation screen
  if (showConfirm && studentProfile && !examStarted && questions.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl border border-border text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl exam-gradient">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Konfirmasi Data Peserta</h2>
          <p className="text-sm text-muted-foreground mb-4">Pastikan data berikut sudah benar sebelum memulai ujian.</p>

          {draftLoaded && (
            <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary flex items-center gap-2">
              <Cloud className="h-4 w-4 shrink-0" />
              <span>Jawaban sebelumnya ditemukan dan akan dilanjutkan otomatis.</span>
            </div>
          )}

          <div className="text-left rounded-xl border border-border bg-muted/30 p-4 mb-4 space-y-2">
            {[
              { label: "Nama", value: studentProfile.full_name },
              { label: "NISN", value: studentProfile.nisn || "-" },
              { label: "No. Ujian", value: studentProfile.exam_number || "-" },
              { label: "Kelas", value: studentProfile.class_name },
              { label: "Ruangan", value: studentProfile.room_name },
              { label: "Ujian", value: examTitle },
              { label: "Mata Pelajaran", value: examSubject },
              { label: "Durasi", value: `${examDuration} menit` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <Button onClick={() => setShowConfirm(false)} className="w-full gap-2 exam-gradient border-0 h-12 text-base">
            Data Sudah Benar, Lanjutkan
          </Button>
        </div>
      </div>
    );
  }

  if (!examStarted && questions.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl border border-border text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl exam-gradient">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Mode Ujian Aman</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Ujian akan dimulai dalam <strong>mode fullscreen</strong>. Selama ujian berlangsung:
          </p>
          <div className="text-left space-y-2 mb-6">
            {[
              "Copy, paste, dan klik kanan dinonaktifkan",
              "Berpindah tab/jendela akan tercatat sebagai pelanggaran",
              "Keluar fullscreen akan tercatat sebagai pelanggaran",
              `Maksimal ${maxViolations} pelanggaran — ujian otomatis dikumpulkan`,
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
          <Button onClick={handleStartExam} className="w-full gap-2 exam-gradient border-0 h-12 text-base">
            <Maximize className="h-5 w-5" /> Mulai Ujian
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => {
    if (typeof a === "string") return a.trim().length > 0;
    if (Array.isArray(a)) return a.length > 0;
    return a !== undefined && a !== null;
  }).length;

  return (
    <div className="min-h-screen bg-background select-none">
      <ViolationOverlay
        violationType={lastViolationType}
        violationCount={violations}
        maxViolations={maxViolations}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg exam-gradient">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">{examTitle}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{studentName} • {examSubject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {violations > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg bg-destructive/10 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {violations}/{maxViolations}
              </div>
            )}
            <ExamTimer duration={examDuration} onTimeUp={handleTimeUp} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main Question Area */}
          <div>
            <QuestionCard
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              text={question.question_text}
              imageUrl={question.image_url}
              options={question.options}
              questionType={question.question_type as any}
              selectedAnswer={answers[currentIndex]}
              isFlagged={flagged.has(currentIndex)}
              onAnswer={handleAnswer}
              onToggleFlag={handleToggleFlag}
            />

            {/* Navigation Buttons */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Sebelumnya</span><span className="sm:hidden">Prev</span>
              </Button>

              {/* Mobile nav trigger */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-1 text-xs">
                    <LayoutGrid className="h-4 w-4" />
                    {currentIndex + 1}/{questions.length}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[70vh]">
                  <SheetHeader>
                    <SheetTitle>Navigasi Soal</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <QuestionNav
                      total={questions.length}
                      current={currentIndex}
                      answers={answers}
                      flagged={flagged}
                      onNavigate={(i) => {
                        setCurrentIndex(i);
                        setMobileNavOpen(false);
                      }}
                    />
                  </div>
                  <div className="mt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full gap-2 exam-gradient border-0">
                          <Send className="h-4 w-4" /> Kumpulkan Jawaban
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Kumpulkan Jawaban?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Anda telah menjawab {answeredCount} dari {questions.length} soal.
                            {answeredCount < questions.length && (
                              <span className="mt-1 block font-medium text-warning">
                                ⚠️ Masih ada {questions.length - answeredCount} soal belum dijawab!
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Kembali</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSubmit} className="exam-gradient border-0">
                            Ya, Kumpulkan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </SheetContent>
              </Sheet>

              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                  className="gap-1 sm:gap-2 exam-gradient border-0 text-xs sm:text-sm px-2 sm:px-4"
                  size="sm"
                >
                  <span className="hidden sm:inline">Selanjutnya</span><span className="sm:hidden">Next</span> <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="gap-1 sm:gap-2 exam-gradient border-0 text-xs sm:text-sm px-2 sm:px-4" size="sm">
                      <Send className="h-4 w-4" /> Kumpulkan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Kumpulkan Jawaban?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anda telah menjawab {answeredCount} dari {questions.length} soal.
                        {answeredCount < questions.length && (
                          <span className="mt-1 block font-medium text-warning">
                            ⚠️ Masih ada {questions.length - answeredCount} soal belum dijawab!
                          </span>
                        )}
                        Setelah dikumpulkan, jawaban tidak dapat diubah.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Kembali</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSubmit} className="exam-gradient border-0">
                        Ya, Kumpulkan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Sidebar Nav - Desktop only */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <QuestionNav
                total={questions.length}
                current={currentIndex}
                answers={answers}
                flagged={flagged}
                onNavigate={setCurrentIndex}
              />

              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full gap-2 exam-gradient border-0">
                      <Send className="h-4 w-4" /> Kumpulkan Jawaban
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Kumpulkan Jawaban?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anda telah menjawab {answeredCount} dari {questions.length} soal.
                        {answeredCount < questions.length && (
                          <span className="mt-1 block font-medium text-warning">
                            ⚠️ Masih ada {questions.length - answeredCount} soal belum dijawab!
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Kembali</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSubmit} className="exam-gradient border-0">
                        Ya, Kumpulkan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPage;
