import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface SessionResult {
  id: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  started_at: string;
  finished_at: string | null;
  exam_title: string;
  student_name: string;
}

const StudentResults = () => {
  const [results, setResults] = useState<SessionResult[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      // Fetch sessions with exam and profile info
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("*, exams(title), profiles!exam_sessions_student_id_fkey(full_name)")
        .order("started_at", { ascending: false });

      if (sessions) {
        setResults(
          sessions.map((s: any) => ({
            id: s.id,
            score: s.score,
            total_questions: s.total_questions,
            correct_answers: s.correct_answers,
            started_at: s.started_at,
            finished_at: s.finished_at,
            exam_title: s.exams?.title || "Unknown",
            student_name: s.profiles?.full_name || "Unknown",
          }))
        );
      }
    };
    fetchResults();
  }, []);

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Hasil Siswa</h2>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Belum ada hasil ujian.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Siswa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ujian</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Benar</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Nilai</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const score = r.total_questions ? Math.round(((r.correct_answers || 0) / r.total_questions) * 100) : 0;
                const passed = score >= 70;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_title}</td>
                    <td className="px-4 py-3 text-center">{r.correct_answers ?? "-"}/{r.total_questions ?? "-"}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{r.finished_at ? score : "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {r.finished_at ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {passed ? "Lulus" : "Tidak Lulus"}
                        </span>
                      ) : (
                        <span className="text-xs text-warning">Berlangsung</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(r.started_at).toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default StudentResults;
