import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SessionResult {
  id: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  started_at: string;
  finished_at: string | null;
  exam_title: string;
  exam_subject: string;
  student_name: string;
  class_name: string;
  class_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

const StudentResults = () => {
  const [results, setResults] = useState<SessionResult[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  const exportCSV = (data: SessionResult[], filename: string) => {
    const header = ["Nama", "Kelas", "Ujian", "Mapel", "Benar", "Total", "Nilai", "Status", "Waktu Mulai"];
    const rows = data.map((r) => {
      const score = r.total_questions ? Math.round(((r.correct_answers || 0) / r.total_questions) * 100) : 0;
      const passed = score >= 70;
      return [
        r.student_name,
        r.class_name,
        r.exam_title,
        r.exam_subject,
        r.correct_answers ?? 0,
        r.total_questions ?? 0,
        r.finished_at ? score : "-",
        r.finished_at ? (passed ? "Lulus" : "Tidak Lulus") : "Berlangsung",
        new Date(r.started_at).toLocaleString("id-ID"),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch classes
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .order("sort_order");
      setClasses(classData || []);

      // Fetch sessions with exam info
      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("*, exams(title, subject)")
        .order("started_at", { ascending: false });

      if (sessions) {
        const studentIds = [...new Set(sessions.map((s: any) => s.student_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, class_id")
          .in("user_id", studentIds);

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, p])
        );

        const classMap = new Map((classData || []).map((c) => [c.id, c.name]));

        const mapped = sessions.map((s: any) => {
          const profile = profileMap.get(s.student_id);
          return {
            id: s.id,
            score: s.score,
            total_questions: s.total_questions,
            correct_answers: s.correct_answers,
            started_at: s.started_at,
            finished_at: s.finished_at,
            exam_title: s.exams?.title || "Unknown",
            exam_subject: s.exams?.subject || "Unknown",
            student_name: profile?.full_name || "Unknown",
            class_name: profile?.class_id ? classMap.get(profile.class_id) || "-" : "-",
            class_id: profile?.class_id || null,
          };
        });

        setResults(mapped);

        // Extract unique subjects
        const uniqueSubjects = [...new Set(mapped.map((r) => r.exam_subject))].sort();
        setSubjects(uniqueSubjects);
      }
    };
    fetchData();
  }, []);

  const filtered = results.filter((r) => {
    if (filterClass !== "all" && r.class_id !== filterClass) return false;
    if (filterSubject !== "all" && r.exam_subject !== filterSubject) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Hasil Siswa</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={filtered.length === 0}
            onClick={() => {
              const label = filterClass !== "all"
                ? classes.find(c => c.id === filterClass)?.name || "kelas"
                : filterSubject !== "all" ? filterSubject : "semua";
              exportCSV(filtered, `hasil-ujian-${label}.csv`);
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-48">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Mapel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mapel</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          {filtered.length} hasil
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Belum ada hasil ujian.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Siswa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kelas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ujian</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mapel</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Benar</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Nilai</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const score = r.total_questions ? Math.round(((r.correct_answers || 0) / r.total_questions) * 100) : 0;
                const passed = score >= 70;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{r.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.class_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_subject}</td>
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
