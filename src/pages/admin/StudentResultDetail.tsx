import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import MathText from "@/components/exam/MathText";

interface AnswerDetail {
  question_id: string;
  sort_order: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  selected_answer: number | null;
}

interface SessionInfo {
  student_name: string;
  class_name: string;
  exam_title: string;
  exam_subject: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  started_at: string;
  finished_at: string | null;
}

const LABELS = ["A", "B", "C", "D"];

const StudentResultDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchDetail = async () => {
      setLoading(true);

      // Fetch session + exam info
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exams(title, subject)")
        .eq("id", sessionId)
        .single();

      if (!sess) { setLoading(false); return; }

      // Fetch student profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, class_id")
        .eq("user_id", sess.student_id)
        .single();

      let className = "-";
      if (profile?.class_id) {
        const { data: cls } = await supabase
          .from("classes").select("name").eq("id", profile.class_id).single();
        if (cls) className = cls.name;
      }

      setSession({
        student_name: profile?.full_name || "Unknown",
        class_name: className,
        exam_title: (sess as any).exams?.title || "-",
        exam_subject: (sess as any).exams?.subject || "-",
        score: sess.score,
        correct_answers: sess.correct_answers,
        total_questions: sess.total_questions,
        started_at: sess.started_at,
        finished_at: sess.finished_at,
      });

      // Fetch questions for this exam
      const { data: questions } = await supabase
        .from("questions")
        .select("id, sort_order, question_text, options, correct_answer")
        .eq("exam_id", (sess as any).exam_id)
        .order("sort_order");

      // Fetch student answers
      const { data: studentAnswers } = await supabase
        .from("student_answers")
        .select("question_id, selected_answer")
        .eq("session_id", sessionId);

      const answerMap = new Map((studentAnswers || []).map((a) => [a.question_id, a.selected_answer]));

      const details: AnswerDetail[] = (questions || []).map((q) => ({
        question_id: q.id,
        sort_order: q.sort_order,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? (q.options as string[]) : [],
        correct_answer: q.correct_answer,
        selected_answer: answerMap.has(q.id) ? answerMap.get(q.id)! : null,
      }));

      setAnswers(details);
      setLoading(false);
    };
    fetchDetail();
  }, [sessionId]);

  const score = session?.finished_at && session?.total_questions
    ? (session.correct_answers || 0)
    : null;
  const percentage = session?.finished_at && session?.total_questions
    ? Math.round(((session.correct_answers || 0) / session.total_questions) * 100)
    : null;
  const passed = (percentage ?? 0) >= 70;

  return (
    <AdminLayout>
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-3">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        {loading ? (
          <div className="text-center text-muted-foreground py-20">Memuat data...</div>
        ) : !session ? (
          <div className="text-center text-muted-foreground py-20">Data tidak ditemukan</div>
        ) : (
          <>
            {/* Session Info Card */}
            <div className="rounded-xl border border-border bg-card p-5 mb-6">
              <div className="flex flex-wrap gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground">{session.student_name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {session.class_name} • {session.exam_subject} • {session.exam_title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(session.started_at).toLocaleString("id-ID")}
                    {session.finished_at && ` – ${new Date(session.finished_at).toLocaleString("id-ID")}`}
                  </p>
                </div>
                <div className="flex gap-4 items-center shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Benar</p>
                    <p className="text-2xl font-bold text-foreground">
                      {session.correct_answers ?? "-"}<span className="text-sm font-normal text-muted-foreground">/{session.total_questions ?? "-"}</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Nilai</p>
                    <p className={`text-3xl font-bold ${passed ? "text-success" : "text-destructive"}`}>{score ?? "-"}</p>
                  </div>
                  {session.finished_at && (
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {passed ? "Lulus" : "Tidak Lulus"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1.5 text-success"><CheckCircle className="h-4 w-4" /> Benar</span>
              <span className="flex items-center gap-1.5 text-destructive"><XCircle className="h-4 w-4" /> Salah</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><MinusCircle className="h-4 w-4" /> Tidak dijawab</span>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {answers.map((q, idx) => {
                const isCorrect = q.selected_answer === q.correct_answer;
                const isUnanswered = q.selected_answer === null;
                return (
                  <div
                    key={q.question_id}
                    className={`rounded-xl border p-4 ${
                      isUnanswered ? "border-border bg-card" :
                      isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="flex gap-3 items-start mb-3">
                      <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                        {idx + 1}
                      </span>
                      <div className="flex-1 text-sm text-foreground leading-relaxed">
                        <MathText text={q.question_text} />
                      </div>
                      <div className="shrink-0">
                        {isUnanswered ? (
                          <MinusCircle className="h-5 w-5 text-muted-foreground" />
                        ) : isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                      {q.options.map((opt, oi) => {
                        const isSelected = q.selected_answer === oi;
                        const isCorrectOpt = q.correct_answer === oi;
                        let optClass = "rounded-lg border px-3 py-1.5 text-sm flex items-center gap-2 ";
                        if (isCorrectOpt) optClass += "border-success/50 bg-success/10 text-success font-semibold";
                        else if (isSelected && !isCorrectOpt) optClass += "border-destructive/50 bg-destructive/10 text-destructive";
                        else optClass += "border-border text-muted-foreground";

                        return (
                          <div key={oi} className={optClass}>
                            <span className="font-bold w-5 shrink-0">{LABELS[oi]}.</span>
                            <span className="flex-1"><MathText text={opt} /></span>
                            {isCorrectOpt && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                            {isSelected && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {!isUnanswered && !isCorrect && (
                      <p className="mt-2 pl-10 text-xs text-success">
                        ✓ Jawaban benar: <strong>{LABELS[q.correct_answer]}</strong>
                      </p>
                    )}
                    {isUnanswered && (
                      <p className="mt-2 pl-10 text-xs text-muted-foreground">
                        Tidak dijawab • Jawaban benar: <strong className="text-success">{LABELS[q.correct_answer]}</strong>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default StudentResultDetail;
