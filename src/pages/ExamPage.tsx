import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ChevronLeft, ChevronRight, Send, Shield, Maximize, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ExamTimer from "@/components/exam/ExamTimer";
import QuestionCard from "@/components/exam/QuestionCard";
import QuestionNav from "@/components/exam/QuestionNav";
import { useAntiCheat } from "@/hooks/useAntiCheat";
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

interface DBQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  sort_order: number;
  image_url?: string;
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
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [loadingQ, setLoadingQ] = useState(true);
  const [examStarted, setExamStarted] = useState(false);

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
        .from("questions")
        .select("*")
        .eq("exam_id", state.examId)
        .order("sort_order");
      if (data) {
        setQuestions(
          data.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options as string[],
            correct_answer: q.correct_answer,
            sort_order: q.sort_order,
            image_url: q.image_url || undefined,
          }))
        );
      }
      setLoadingQ(false);
    };
    fetchQuestions();
  }, [state, navigate]);

  const handleSubmitFn = useCallback(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    navigate("/result", {
      state: {
        studentName,
        examTitle,
        total: questions.length,
        correct,
        answers,
        questions: questions.map((q) => ({
          id: q.id,
          text: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
        })),
      },
    });
  }, [answers, questions, navigate, studentName, examTitle]);

  // Anti-cheat
  const { violations, isFullscreen, enterFullscreen, maxViolations } = useAntiCheat(
    examStarted,
    {
      maxViolations: 3,
      onMaxViolations: () => {
        handleSubmitFn();
      },
    }
  );

  const handleAnswer = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
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

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg exam-gradient">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">{examTitle}</h1>
              <p className="text-xs text-muted-foreground">{studentName} • {examSubject}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {violations > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {violations}/{maxViolations}
              </div>
            )}
            <ExamTimer duration={examDuration} onTimeUp={handleTimeUp} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Main Question Area */}
          <div>
            <QuestionCard
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              text={question.question_text}
              imageUrl={question.image_url}
              options={question.options}
              selectedAnswer={answers[currentIndex]}
              isFlagged={flagged.has(currentIndex)}
              onAnswer={handleAnswer}
              onToggleFlag={handleToggleFlag}
            />

            {/* Navigation Buttons */}
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                  className="gap-2 exam-gradient border-0"
                >
                  Selanjutnya <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="gap-2 exam-gradient border-0">
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

          {/* Sidebar Nav */}
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
