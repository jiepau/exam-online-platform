import { useEffect, useState, useMemo } from "react";
import { Download, Users, BookOpen, TrendingUp, CheckCircle, Trash2, Eye, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

const calcScore = (r: SessionResult) =>
  r.finished_at && r.total_questions
    ? Math.round(((r.correct_answers || 0) / r.total_questions) * 100)
    : null;

const StudentResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<SessionResult[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null); // session id
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const exportCSV = (data: SessionResult[], filename: string) => {
    const header = ["Nama", "Kelas", "Ujian", "Mapel", "Benar", "Total", "Nilai", "Status", "Waktu Mulai"];
    const rows = data.map((r) => {
      const score = calcScore(r);
      return [
        r.student_name, r.class_name, r.exam_title, r.exam_subject,
        r.correct_answers ?? 0, r.total_questions ?? 0,
        score ?? "-",
        r.finished_at ? ((score ?? 0) >= 70 ? "Lulus" : "Tidak Lulus") : "Berlangsung",
        new Date(r.started_at).toLocaleString("id-ID"),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: classData } = await supabase.from("classes").select("id, name").order("sort_order");
      setClasses(classData || []);

      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("*, exams(title, subject)")
        .order("started_at", { ascending: false });

      if (sessions) {
        const studentIds = [...new Set(sessions.map((s: any) => s.student_id))];
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, full_name, class_id").in("user_id", studentIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const classMap = new Map((classData || []).map((c) => [c.id, c.name]));

        const mapped = sessions.map((s: any) => {
          const profile = profileMap.get(s.student_id);
          return {
            id: s.id, score: s.score, total_questions: s.total_questions,
            correct_answers: s.correct_answers, started_at: s.started_at,
            finished_at: s.finished_at,
            exam_title: s.exams?.title || "Unknown",
            exam_subject: s.exams?.subject || "Unknown",
            student_name: profile?.full_name || "Unknown",
            class_name: profile?.class_id ? classMap.get(profile.class_id) || "-" : "-",
            class_id: profile?.class_id || null,
          };
        });

        setResults(mapped);
        setSubjects([...new Set(mapped.map((r) => r.exam_subject))].sort());
      }
    };
    fetchData();
  }, []);

  const handleDeleteOne = async (sessionId: string) => {
    // Delete answers first, then session
    await supabase.from("student_answers").delete().eq("session_id", sessionId);
    const { error } = await supabase.from("exam_sessions").delete().eq("id", sessionId);
    if (error) { toast.error("Gagal menghapus hasil"); return; }
    toast.success("Hasil ujian berhasil dihapus");
    setResults((prev) => prev.filter((r) => r.id !== sessionId));
    setDeleteTarget(null);
  };

  const handleDeleteFiltered = async () => {
    const ids = filtered.map((r) => r.id);
    for (const id of ids) {
      await supabase.from("student_answers").delete().eq("session_id", id);
    }
    const { error } = await supabase.from("exam_sessions").delete().in("id", ids);
    if (error) { toast.error("Gagal menghapus hasil"); return; }
    toast.success(`${ids.length} hasil ujian berhasil dihapus`);
    setResults((prev) => prev.filter((r) => !ids.includes(r.id)));
    setDeleteAllConfirm(false);
  };

  const filtered = results.filter((r) => {
    if (filterClass !== "all" && r.class_id !== filterClass) return false;
    if (filterSubject !== "all" && r.exam_subject !== filterSubject) return false;
    return true;
  });

  // Summary stats computed from filtered finished results
  const finishedFiltered = filtered.filter((r) => r.finished_at);

  const avgScore = useMemo(() => {
    if (!finishedFiltered.length) return null;
    const total = finishedFiltered.reduce((sum, r) => sum + (calcScore(r) ?? 0), 0);
    return Math.round(total / finishedFiltered.length);
  }, [finishedFiltered]);

  const passCount = finishedFiltered.filter((r) => (calcScore(r) ?? 0) >= 70).length;
  const passRate = finishedFiltered.length ? Math.round((passCount / finishedFiltered.length) * 100) : null;

  // Rekap per kelas (hanya jika tidak filter ke kelas tertentu)
  const byClass = useMemo(() => {
    if (filterClass !== "all") return [];
    const map = new Map<string, { name: string; scores: number[] }>();
    finishedFiltered.forEach((r) => {
      const key = r.class_id || "__none__";
      if (!map.has(key)) map.set(key, { name: r.class_name, scores: [] });
      const s = calcScore(r);
      if (s !== null) map.get(key)!.scores.push(s);
    });
    return [...map.entries()]
      .map(([, v]) => ({
        name: v.name,
        avg: v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0,
        count: v.scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [finishedFiltered, filterClass]);

  // Rekap per mapel (hanya jika tidak filter ke mapel tertentu)
  const bySubject = useMemo(() => {
    if (filterSubject !== "all") return [];
    const map = new Map<string, number[]>();
    finishedFiltered.forEach((r) => {
      if (!map.has(r.exam_subject)) map.set(r.exam_subject, []);
      const s = calcScore(r);
      if (s !== null) map.get(r.exam_subject)!.push(s);
    });
    return [...map.entries()]
      .map(([subject, scores]) => ({
        name: subject,
        avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        count: scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [finishedFiltered, filterSubject]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Hasil Siswa</h2>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm" className="gap-2"
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
          <Button
            variant="destructive" size="sm" className="gap-2"
            disabled={filtered.length === 0}
            onClick={() => setDeleteAllConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Hapus {filtered.length > 0 ? `(${filtered.length})` : "Semua"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {finishedFiltered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Selesai</p>
              <p className="text-xl font-bold text-foreground">{finishedFiltered.length}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata Nilai</p>
              <p className="text-xl font-bold text-foreground">{avgScore ?? "-"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lulus</p>
              <p className="text-xl font-bold text-success">{passCount} <span className="text-sm font-normal text-muted-foreground">({passRate}%)</span></p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <BookOpen className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tidak Lulus</p>
              <p className="text-xl font-bold text-destructive">{finishedFiltered.length - passCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rekap per Kelas & per Mapel */}
      {(byClass.length > 0 || bySubject.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {byClass.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Rata-rata per Kelas
              </h3>
              <div className="space-y-2">
                {byClass.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24 truncate" title={c.name}>{c.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.avg}%`, backgroundColor: c.avg >= 70 ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${c.avg >= 70 ? "text-success" : "text-destructive"}`}>{c.avg}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">({c.count} siswa)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {bySubject.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Rata-rata per Mapel
              </h3>
              <div className="space-y-2">
                {bySubject.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24 truncate" title={s.name}>{s.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.avg}%`, backgroundColor: s.avg >= 70 ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${s.avg >= 70 ? "text-success" : "text-destructive"}`}>{s.avg}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">({s.count} ujian)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-48">
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger><SelectValue placeholder="Semua Mapel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mapel</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">{filtered.length} hasil</div>
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
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const score = calcScore(r);
                const passed = (score ?? 0) >= 70;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.class_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_subject}</td>
                    <td className="px-4 py-3 text-center">{r.correct_answers ?? "-"}/{r.total_questions ?? "-"}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{score ?? "-"}</td>
                    <td className="px-4 py-3 text-center">
                      {r.finished_at ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {passed ? "Lulus" : "Tidak Lulus"}
                        </span>
                      ) : (
                        <span className="text-xs text-warning">Berlangsung</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.started_at).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary"
                          title="Lihat detail jawaban"
                          onClick={() => navigate(`/admin/results/${r.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Hapus hasil ini"
                          onClick={() => setDeleteTarget(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete one confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Hapus Hasil Ujian?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hasil ujian siswa ini akan dihapus permanen termasuk semua data jawaban. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteTarget && handleDeleteOne(deleteTarget)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all (filtered) confirmation */}
      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Hapus {filtered.length} Hasil Ujian?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua hasil yang ditampilkan ({filtered.length} data) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteFiltered}>
              Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default StudentResults;


