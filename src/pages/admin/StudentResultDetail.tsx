import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, AlertCircle, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import MathText from "@/components/exam/MathText";
import ResultPrinter from "@/components/admin/ResultPrinter";

interface AnswerDetail {
  question_id: string;
  sort_order: number;
  question_text: string;
  options: string[];
  correct_answer: number;
  correct_answer_data: any;
  question_type: string;
  point_weight: number;
  selected_answer: number | null;
  selected_answer_data: any;
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

const LABELS = ["A", "B", "C", "D", "E", "F"];

const StudentResultDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [studentExtra, setStudentExtra] = useState<{ nisn?: string; exam_number?: string }>({});

  useEffect(() => {
    if (!sessionId) return;
    const fetchDetail = async () => {
      setLoading(true);
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exams(title, subject)")
        .eq("id", sessionId)
        .single();
      if (!sess) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles").select("full_name, class_id").eq("user_id", sess.student_id).single();

      let className = "-";
      if (profile?.class_id) {
        const { data: cls } = await supabase.from("classes").select("name").eq("id", profile.class_id).single();
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

      const { data: questions } = await supabase
        .from("questions")
        .select("id, sort_order, question_text, options, correct_answer, correct_answer_data, question_type, point_weight")
        .eq("exam_id", (sess as any).exam_id)
        .order("sort_order");

      const { data: studentAnswers } = await supabase
        .from("student_answers")
        .select("question_id, selected_answer, selected_answer_data")
        .eq("session_id", sessionId);

      const answerMap = new Map((studentAnswers || []).map((a: any) => [a.question_id, a]));

      const details: AnswerDetail[] = (questions || []).map((q: any) => {
        const sa = answerMap.get(q.id);
        return {
          question_id: q.id,
          sort_order: q.sort_order,
          question_text: q.question_text,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          correct_answer: q.correct_answer,
          correct_answer_data: q.correct_answer_data,
          question_type: q.question_type || "multiple_choice",
          point_weight: q.point_weight ?? 1,
          selected_answer: sa?.selected_answer ?? null,
          selected_answer_data: sa?.selected_answer_data ?? null,
        };
      });

      setAnswers(details);
      setLoading(false);
    };
    fetchDetail();
  }, [sessionId]);

  const isCorrectAnswer = (q: AnswerDetail): boolean | null | "partial" => {
    const type = q.question_type;
    if (type === "multiple_choice" || type === "true_false") {
      if (q.selected_answer === null) return null;
      return q.selected_answer === q.correct_answer;
    }
    if (type === "multiple_select") {
      const correctIndices: number[] = Array.isArray(q.correct_answer_data) ? q.correct_answer_data : [];
      const studentIndices: number[] = Array.isArray(q.selected_answer_data) ? q.selected_answer_data : [];
      if (studentIndices.length === 0) return null;
      const correctHits = studentIndices.filter((i) => correctIndices.includes(i)).length;
      const wrongHits = studentIndices.filter((i) => !correctIndices.includes(i)).length;
      const ratio = Math.max(0, (correctHits - wrongHits) / correctIndices.length);
      if (ratio === 1) return true;
      if (ratio > 0) return "partial";
      return false;
    }
    if (type === "short_answer") {
      const studentText = typeof q.selected_answer_data === "string" ? q.selected_answer_data.trim().toLowerCase() : "";
      if (!studentText) return null;
      const data = q.correct_answer_data || {};
      const correct = (data.answer || "").trim().toLowerCase();
      const aliases: string[] = (data.aliases || []).map((a: string) => a.trim().toLowerCase());
      return [correct, ...aliases].filter(Boolean).includes(studentText);
    }
    if (type === "matching") {
      const studentOrder: number[] = Array.isArray(q.selected_answer_data) ? q.selected_answer_data : [];
      if (studentOrder.length === 0) return null;
      const correctPairs = studentOrder.filter((v, i) => v === i).length;
      if (correctPairs === studentOrder.length) return true;
      if (correctPairs > 0) return "partial";
      return false;
    }
    return null;
  };

  const maxScore = answers.reduce((sum, q) => sum + (q.point_weight || 1), 0);
  const earnedScore = session?.score ?? null;
  const percentage = session?.finished_at && maxScore > 0
    ? Math.round(((earnedScore || 0) / maxScore) * 100) : null;
  const passed = (percentage ?? 0) >= 70;
  const hasCustomWeights = answers.some((q) => q.point_weight > 1);

  const renderQuestionResult = (q: AnswerDetail, idx: number) => {
    const correct = isCorrectAnswer(q);
    const isUnanswered = correct === null;
    const isCorrect = correct === true;
    const isPartial = correct === "partial";
    const type = q.question_type;

    const typeLabel = type === "true_false" ? "B/S" : type === "multiple_select" ? "PG Kompleks" : type === "short_answer" ? "Isian" : type === "matching" ? "Menjodohkan" : "";
    const weight = q.point_weight || 1;

    return (
      <div key={q.question_id}
        className={`rounded-xl border p-4 ${
          isUnanswered ? "border-border bg-card" :
          isCorrect ? "border-success/30 bg-success/5" :
          isPartial ? "border-warning/30 bg-warning/5" :
          "border-destructive/30 bg-destructive/5"
        }`}
      >
        <div className="flex gap-3 items-start mb-3">
          <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
            {idx + 1}
          </span>
          <div className="flex-1 text-sm text-foreground leading-relaxed">
            <MathText text={q.question_text} />
            {typeLabel && (
              <span className="ml-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                {typeLabel}
              </span>
            )}
            {weight > 1 && (
              <span className="ml-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {weight} poin
              </span>
            )}
          </div>
          <div className="shrink-0">
            {isUnanswered ? <MinusCircle className="h-5 w-5 text-muted-foreground" /> :
             isCorrect ? <CheckCircle className="h-5 w-5 text-success" /> :
             isPartial ? <AlertCircle className="h-5 w-5 text-warning" /> :
             <XCircle className="h-5 w-5 text-destructive" />}
          </div>
        </div>

        {/* Multiple Choice / True False */}
        {(type === "multiple_choice" || type === "true_false") && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
              {q.options.map((opt, oi) => {
                const isSelected = q.selected_answer === oi;
                const isCorrectOpt = q.correct_answer === oi;
                let optClass = "rounded-lg border px-3 py-1.5 text-sm flex items-center gap-2 ";
                if (isCorrectOpt) optClass += "border-success/50 bg-success/10 text-success font-semibold";
                else if (isSelected && !isCorrectOpt) optClass += "border-destructive/50 bg-destructive/10 text-destructive";
                else optClass += "border-border text-muted-foreground";
                const label = type === "true_false" ? (oi === 0 ? "B" : "S") : LABELS[oi];
                return (
                  <div key={oi} className={optClass}>
                    <span className="font-bold w-5 shrink-0">{label}.</span>
                    <span className="flex-1"><MathText text={opt} /></span>
                    {isCorrectOpt && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                    {isSelected && !isCorrectOpt && <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                );
              })}
            </div>
            {!isUnanswered && !isCorrect && (
              <p className="mt-2 pl-10 text-xs text-success">
                ✓ Jawaban benar: <strong>{type === "true_false" ? (q.correct_answer === 0 ? "Benar" : "Salah") : LABELS[q.correct_answer]}</strong>
              </p>
            )}
            {isUnanswered && (
              <p className="mt-2 pl-10 text-xs text-muted-foreground">
                Tidak dijawab • Jawaban benar: <strong className="text-success">{type === "true_false" ? (q.correct_answer === 0 ? "Benar" : "Salah") : LABELS[q.correct_answer]}</strong>
              </p>
            )}
          </>
        )}

        {/* Multiple Select */}
        {type === "multiple_select" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
              {q.options.map((opt, oi) => {
                const correctIndices: number[] = Array.isArray(q.correct_answer_data) ? q.correct_answer_data : [];
                const studentIndices: number[] = Array.isArray(q.selected_answer_data) ? q.selected_answer_data : [];
                const isCorrectOpt = correctIndices.includes(oi);
                const isSelected = studentIndices.includes(oi);
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
                ✓ Jawaban benar: <strong>{(q.correct_answer_data || []).map((i: number) => LABELS[i]).join(", ")}</strong>
              </p>
            )}
          </>
        )}

        {/* Short Answer */}
        {type === "short_answer" && (
          <div className="pl-10 space-y-2">
            <div className={`rounded-lg border px-3 py-2 text-sm ${
              isUnanswered ? "border-border text-muted-foreground italic" :
              isCorrect ? "border-success/50 bg-success/10 text-success" :
              "border-destructive/50 bg-destructive/10 text-destructive"
            }`}>
              Jawaban siswa: <strong>{typeof q.selected_answer_data === "string" ? q.selected_answer_data : "(tidak dijawab)"}</strong>
            </div>
            {(!isCorrect) && (
              <p className="text-xs text-success">
                ✓ Jawaban benar: <strong>{q.correct_answer_data?.answer || "-"}</strong>
              </p>
            )}
          </div>
        )}

        {/* Matching */}
        {type === "matching" && (() => {
          const pairs = (q.options || []).map((opt: string) => {
            const idx = (opt || "").indexOf("|");
            if (idx === -1) return { left: opt, right: opt };
            return { left: opt.substring(0, idx), right: opt.substring(idx + 1) };
          });
          const studentOrder: number[] = Array.isArray(q.selected_answer_data) ? q.selected_answer_data : [];
          return (
            <div className="pl-10 space-y-2">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                {pairs.map((pair: {left: string; right: string}, pi: number) => {
                  const studentRightIdx = studentOrder[pi];
                  const studentRight = studentRightIdx !== undefined ? pairs[studentRightIdx]?.right : undefined;
                  const pairCorrect = studentRightIdx === pi;
                  return (
                    <>
                      <div key={`l${pi}`} className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm">
                        <span className="font-bold text-primary mr-1">{pi + 1}.</span> {pair.left}
                      </div>
                      <span key={`a${pi}`} className="text-muted-foreground">→</span>
                      <div key={`r${pi}`} className={`rounded-lg border px-3 py-1.5 text-sm ${
                        !studentRight ? "border-border text-muted-foreground italic" :
                        pairCorrect ? "border-success/50 bg-success/10 text-success" :
                        "border-destructive/50 bg-destructive/10 text-destructive"
                      }`}>
                        {studentRight || "(tidak dijawab)"}
                        {!pairCorrect && studentRight && (
                          <span className="ml-2 text-xs text-success">✓ {pair.right}</span>
                        )}
                      </div>
                    </>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

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
                    <p className="text-xs text-muted-foreground">Skor</p>
                    <p className={`text-3xl font-bold ${passed ? "text-success" : "text-destructive"}`}>
                      {earnedScore ?? "-"}<span className="text-sm font-normal text-muted-foreground">/{maxScore}</span>
                    </p>
                  </div>
                  {percentage !== null && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Persentase</p>
                      <p className={`text-2xl font-bold ${passed ? "text-success" : "text-destructive"}`}>{percentage}%</p>
                    </div>
                  )}
                  {session.finished_at && (
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {passed ? "Lulus" : "Tidak Lulus"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1.5 text-success"><CheckCircle className="h-4 w-4" /> Benar</span>
              <span className="flex items-center gap-1.5 text-warning"><AlertCircle className="h-4 w-4" /> Benar Sebagian</span>
              <span className="flex items-center gap-1.5 text-destructive"><XCircle className="h-4 w-4" /> Salah</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><MinusCircle className="h-4 w-4" /> Tidak dijawab</span>
            </div>

            <div className="space-y-4">
              {answers.map((q, idx) => renderQuestionResult(q, idx))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default StudentResultDetail;
