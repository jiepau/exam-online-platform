import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Question } from "@/data/mockExams";

const ExamResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    studentName: string;
    examTitle: string;
    total: number;
    correct: number;
    answers: Record<number, number>;
    questions: Question[];
  };

  if (!state) {
    navigate("/");
    return null;
  }

  const { studentName, examTitle, total, correct, answers, questions } = state;
  const score = Math.round((correct / total) * 100);
  const isPassed = score >= 70;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="exam-gradient px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ExamKu</h1>
            <p className="text-xs text-white/70">Hasil Ujian</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Score Card */}
        <div className="mb-8 rounded-2xl bg-card p-8 shadow-xl border border-border text-center">
          <div
            className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
              isPassed ? "bg-success/10" : "bg-destructive/10"
            }`}
          >
            <Trophy className={`h-12 w-12 ${isPassed ? "text-success" : "text-destructive"}`} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{studentName}</h2>
          <p className="text-muted-foreground">{examTitle}</p>

          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <div className="text-5xl font-extrabold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Nilai</div>
            </div>
            <div className="h-16 w-px bg-border" />
            <div>
              <div className="text-3xl font-bold text-foreground">
                {correct}/{total}
              </div>
              <div className="text-sm text-muted-foreground">Benar</div>
            </div>
          </div>

          <div
            className={`mt-4 inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
              isPassed
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isPassed ? "✅ LULUS" : "❌ TIDAK LULUS"}
          </div>
        </div>

        {/* Answer Review */}
        <h3 className="mb-4 text-lg font-bold text-foreground">Pembahasan Jawaban</h3>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <div
                key={q.id}
                className={`rounded-xl border-2 p-5 ${
                  isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">Soal {i + 1}</span>
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                </div>
                <p className="mb-3 whitespace-pre-line text-sm text-foreground">{q.text}</p>
                <div className="space-y-1.5 text-sm">
                  {userAnswer !== undefined && !isCorrect && (
                    <p className="text-destructive">
                      Jawaban Anda: <strong>{String.fromCharCode(65 + userAnswer)}. {q.options[userAnswer]}</strong>
                    </p>
                  )}
                  <p className="text-success">
                    Jawaban Benar: <strong>{String.fromCharCode(65 + q.correctAnswer)}. {q.options[q.correctAnswer]}</strong>
                  </p>
                  {userAnswer === undefined && (
                    <p className="text-muted-foreground italic">Tidak dijawab</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/")} className="gap-2 exam-gradient border-0">
            <RotateCcw className="h-4 w-4" /> Kembali ke Beranda
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ExamResult;
