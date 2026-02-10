import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockExam } from "@/data/mockExams";
import ExamTimer from "@/components/exam/ExamTimer";
import QuestionCard from "@/components/exam/QuestionCard";
import QuestionNav from "@/components/exam/QuestionNav";
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

const ExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const studentName = (location.state as any)?.studentName || "Siswa";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  const exam = mockExam;
  const question = exam.questions[currentIndex];

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

  const handleSubmit = useCallback(() => {
    let correct = 0;
    exam.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    navigate("/result", {
      state: {
        studentName,
        examTitle: exam.title,
        total: exam.questions.length,
        correct,
        answers,
        questions: exam.questions,
      },
    });
  }, [answers, exam, navigate, studentName]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg exam-gradient">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">{exam.title}</h1>
              <p className="text-xs text-muted-foreground">{studentName} • {exam.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExamTimer duration={exam.duration} onTimeUp={handleTimeUp} />
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
              totalQuestions={exam.questions.length}
              text={question.text}
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

              {currentIndex < exam.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIndex((p) => Math.min(exam.questions.length - 1, p + 1))}
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
                        Anda telah menjawab {answeredCount} dari {exam.questions.length} soal.
                        {answeredCount < exam.questions.length && (
                          <span className="mt-1 block font-medium text-warning">
                            ⚠️ Masih ada {exam.questions.length - answeredCount} soal belum dijawab!
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
                total={exam.questions.length}
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
                        Anda telah menjawab {answeredCount} dari {exam.questions.length} soal.
                        {answeredCount < exam.questions.length && (
                          <span className="mt-1 block font-medium text-warning">
                            ⚠️ Masih ada {exam.questions.length - answeredCount} soal belum dijawab!
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
