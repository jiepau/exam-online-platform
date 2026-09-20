import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Users, BookOpen, TrendingUp, CheckCircle, Trash2, Eye, AlertTriangle, RefreshCw, Printer, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { exportToExcel } from "@/lib/exportExcel";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ResultPrinter, { type ResultData } from "@/components/admin/ResultPrinter";
import { calcFinalScore, KKM } from "@/lib/score";

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
  nisn?: string;
  exam_number?: string;
  student_id?: string;
  exam_id?: string;
  essay_score?: number | null;
  exam_has_essay?: boolean;
  /** total bobot soal (point_weight) ujian terkait */
  max_score: number;
}

interface ClassOption {
  id: string;
  name: string;
}

interface ExamOption {
  id: string;
  title: string;
  subject: string;
}

// batas hari WIB (UTC+7) supaya hasil di tanggal batas tidak hilang
const wibStart = (d: string) => `${d}T00:00:00+07:00`;
const wibEnd = (d: string) => `${d}T23:59:59.999+07:00`;

// Kolom yang benar-benar dipakai UI (hindari select("*"))
const SESSION_COLUMNS =
  "id, score, total_questions, correct_answers, started_at, finished_at, essay_score, student_id, exam_id, class_id, exams!inner(title, subject, has_essay)";

const MAX_BULK_ROWS = 5000;

// nilai akhir 0-100 memakai satu sumber perhitungan (src/lib/score.ts)
const finalOf = (
  r: { finished_at: string | null; score: number | null; essay_score?: number | null; exam_has_essay?: boolean },
  maxScore: number,
) => (r.finished_at ? calcFinalScore(r.score ?? 0, maxScore, r.essay_score ?? null, r.exam_has_essay ?? false) : null);

const StudentResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<SessionResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterExam, setFilterExam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [batchPrintData, setBatchPrintData] = useState<ResultData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statsRows, setStatsRows] = useState<
    {
      finished_at: string | null;
      score: number | null;
      correct_answers: number | null;
      total_questions: number | null;
      student_id: string;
      subject: string;
      essay_score: number | null;
      exam_has_essay: boolean;
      max_score: number;
      /** snapshot kelas saat ujian (null untuk sesi lama) */
      class_id: string | null;
    }[]
  >([]);

  const classMapRef = useRef<Map<string, string>>(new Map());
  const studentClassRef = useRef<Map<string, string | null>>(new Map());
  const examWeightRef = useRef<Map<string, number>>(new Map());
  const examEssayRef = useRef<Map<string, boolean>>(new Map());
  const [masterReady, setMasterReady] = useState(false);

  // debounce pencarian 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // reset ke halaman 1 saat filter/pencarian/page size berubah
  useEffect(() => {
    setPage(1);
  }, [filterClass, filterSubject, filterExam, filterStatus, dateFrom, dateTo, debouncedSearch, pageSize]);

  const filtersActive =
    filterClass !== "all" || filterSubject !== "all" || filterExam !== "all" ||
    filterStatus !== "all" || !!dateFrom || !!dateTo || !!searchQuery;

  const handleResetFilters = () => {
    setFilterClass("all");
    setFilterSubject("all");
    setFilterExam("all");
    setFilterStatus("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setPage(1);
  };

  const handleExportExcel = (data: SessionResult[], label: string) => {
    exportToExcel({
      filename: `hasil-ujian-${label}.xlsx`,
      sheetName: "Hasil Ujian",
      columns: [
        { header: "Nama", key: "nama", width: 25 },
        { header: "Kelas", key: "kelas", width: 15 },
        { header: "Ujian", key: "ujian", width: 25 },
        { header: "Mapel", key: "mapel", width: 15 },
        { header: "Benar", key: "benar", width: 10 },
        { header: "Total", key: "total", width: 10 },
        { header: "Nilai", key: "nilai", width: 10 },
        { header: "Status", key: "status", width: 15 },
        { header: "Waktu Mulai", key: "waktu", width: 22 },
      ],
      rows: data.map((r) => {
        const res = finalOf(r, r.max_score);
        return {
          nama: r.student_name, kelas: r.class_name, ujian: r.exam_title, mapel: r.exam_subject,
          benar: r.correct_answers ?? 0, total: r.total_questions ?? 0,
          nilai: res ? res.finalScore : "-",
          status: !r.finished_at ? "Berlangsung" : res!.passed ? "Lulus" : "Tidak Lulus",
          waktu: new Date(r.started_at).toLocaleString("id-ID"),
        };
      }),
    });
  };

  // ---- master data (kelas, mapel, peta kelas siswa, bobot soal per ujian) ----
  const loadMasterData = useCallback(async () => {
    const [{ data: classData }, { data: examData }, { data: profileData }, { data: weightData }] = await Promise.all([
      supabase.from("classes").select("id, name").order("sort_order"),
      supabase.from("exams").select("id, title, subject, has_essay").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, class_id"),
      supabase.from("questions").select("exam_id, point_weight").range(0, 19999),
    ]);
    setClasses(classData || []);
    classMapRef.current = new Map((classData || []).map((c) => [c.id, c.name]));
    studentClassRef.current = new Map((profileData || []).map((p: any) => [p.user_id, p.class_id ?? null]));
    setExams((examData || []).map((e: any) => ({ id: e.id, title: e.title, subject: e.subject })));
    setSubjects([...new Set((examData || []).map((e: any) => e.subject).filter(Boolean))].sort());
    examEssayRef.current = new Map((examData || []).map((e: any) => [e.id, !!e.has_essay]));
    const wMap = new Map<string, number>();
    (weightData || []).forEach((q: any) => {
      wMap.set(q.exam_id, (wMap.get(q.exam_id) || 0) + (q.point_weight || 1));
    });
    examWeightRef.current = wMap;
    setMasterReady(true);
  }, []);

  // ---- resolusi filter jadi kondisi query database ----
  const resolveFilters = useCallback(async () => {
    let studentIds: string[] | null = null;
    if (filterClass !== "all") {
      const { data } = await supabase.from("profiles").select("user_id").eq("class_id", filterClass);
      studentIds = (data || []).map((p: any) => p.user_id);
    }

    let orExpr: string | null = null;
    const q = debouncedSearch.trim();
    if (q) {
      const [{ data: profs }, { data: exs }] = await Promise.all([
        supabase.from("profiles").select("user_id").ilike("full_name", `%${q}%`).limit(1000),
        supabase.from("exams").select("id").ilike("title", `%${q}%`).limit(1000),
      ]);
      let matchedStudents = (profs || []).map((p: any) => p.user_id);
      if (studentIds) {
        const allowed = new Set(studentIds);
        matchedStudents = matchedStudents.filter((id: string) => allowed.has(id));
      }
      const examIds = (exs || []).map((e: any) => e.id);
      const parts: string[] = [];
      if (matchedStudents.length) parts.push(`student_id.in.(${matchedStudents.join(",")})`);
      if (examIds.length) parts.push(`exam_id.in.(${examIds.join(",")})`);
      if (!parts.length) return { studentIds, orExpr: null, empty: true };
      orExpr = parts.join(",");
    }

    // filter kelas tidak lagi otomatis "kosong": sesi bisa cocok lewat snapshot kelas
    return { studentIds, orExpr, empty: false };
  }, [filterClass, debouncedSearch]);

  const applyFilters = useCallback(
    (query: any, ctx: { studentIds: string[] | null; orExpr: string | null }) => {
      let q = query;
      if (filterClass !== "all") {
        // snapshot kelas bila ada, kalau kosong pakai kelas siswa saat ini
        const ids = ctx.studentIds ?? [];
        const parts = [`class_id.eq.${filterClass}`];
        if (ids.length) parts.push(`and(class_id.is.null,student_id.in.(${ids.join(",")}))`);
        q = q.or(parts.join(","));
      }
      if (filterExam !== "all") q = q.eq("exam_id", filterExam);
      if (filterSubject !== "all") q = q.eq("exams.subject", filterSubject);
      if (filterStatus === "ongoing") q = q.is("finished_at", null);
      if (filterStatus === "finished") q = q.not("finished_at", "is", null);
      if (filterStatus === "need_essay") {
        q = q.not("finished_at", "is", null).is("essay_score", null).eq("exams.has_essay", true);
      }
      if (dateFrom) q = q.gte("started_at", wibStart(dateFrom));
      if (dateTo) q = q.lte("started_at", wibEnd(dateTo));
      if (ctx.orExpr) q = q.or(ctx.orExpr);
      return q;
    },
    [filterClass, filterSubject, filterExam, filterStatus, dateFrom, dateTo]
  );

  const mapSessions = useCallback(async (sessions: any[]): Promise<SessionResult[]> => {
    if (!sessions.length) return [];
    const studentIds = [...new Set(sessions.map((s) => s.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, class_id, nisn, exam_number")
      .in("user_id", studentIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const classMap = classMapRef.current;

    return sessions.map((s) => {
      const profile: any = profileMap.get(s.student_id);
      // kelas histori: snapshot sesi bila ada, fallback ke kelas siswa saat ini
      const effClassId: string | null = s.class_id ?? profile?.class_id ?? null;
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
        class_name: effClassId ? classMap.get(effClassId) || "-" : "-",
        class_id: effClassId,
        nisn: profile?.nisn || undefined,
        exam_number: profile?.exam_number || undefined,
        student_id: s.student_id,
        exam_id: s.exam_id,
        essay_score: s.essay_score ?? null,
        exam_has_essay: s.exams?.has_essay ?? false,
        max_score: examWeightRef.current.get(s.exam_id) || s.total_questions || 0,
      };
    });
  }, []);

  // ---- ambil satu halaman + statistik sesuai filter ----
  const fetchPage = useCallback(async () => {
    if (!masterReady) return; // butuh bobot soal & penanda essay untuk hitung nilai akhir
    setLoading(true);
    setLoadError(null);
    try {
      const ctx = await resolveFilters();
      if (ctx.empty) {
        setResults([]);
        setTotalCount(0);
        setStatsRows([]);
        return;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const pageQuery = applyFilters(
        supabase.from("exam_sessions").select(SESSION_COLUMNS, { count: "exact" }),
        ctx
      )
        .order("started_at", { ascending: false })
        .range(from, to);

      // statistik: payload ringan (tanpa join profil), mengikuti filter aktif
      const statsQuery = applyFilters(
        supabase
          .from("exam_sessions")
          .select("finished_at, score, correct_answers, total_questions, student_id, exam_id, essay_score, exams!inner(subject, has_essay)"),
        ctx
      ).range(0, MAX_BULK_ROWS - 1);

      const [{ data: sessions, count, error }, { data: stats, error: statsError }] = await Promise.all([
        pageQuery,
        statsQuery,
      ]);

      if (error) throw error;
      if (statsError) throw statsError;

      setTotalCount(count ?? 0);
      setResults(await mapSessions(sessions || []));
      setStatsRows(
        (stats || []).map((s: any) => ({
          finished_at: s.finished_at,
          score: s.score,
          correct_answers: s.correct_answers,
          total_questions: s.total_questions,
          student_id: s.student_id,
          subject: s.exams?.subject || "Unknown",
          essay_score: s.essay_score ?? null,
          exam_has_essay: s.exams?.has_essay ?? false,
          max_score: examWeightRef.current.get(s.exam_id) || s.total_questions || 0,
        }))
      );
    } catch (e: any) {
      setLoadError(e?.message || "Gagal memuat hasil ujian.");
    } finally {
      setLoading(false);
    }
  }, [applyFilters, mapSessions, page, pageSize, resolveFilters, masterReady]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // ---- seluruh data sesuai filter (untuk export / cetak / hapus massal) ----
  const fetchAllFiltered = useCallback(
    async (onlyFinished = false): Promise<SessionResult[]> => {
      const ctx = await resolveFilters();
      if (ctx.empty) return [];
      let q = applyFilters(supabase.from("exam_sessions").select(SESSION_COLUMNS), ctx);
      if (onlyFinished) q = q.not("finished_at", "is", null);
      const { data, error } = await q.order("started_at", { ascending: false }).range(0, MAX_BULK_ROWS - 1);
      if (error) throw error;
      return mapSessions(data || []);
    },
    [applyFilters, mapSessions, resolveFilters]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMasterData();
    await fetchPage();
    setRefreshing(false);
    toast.success("Data berhasil diperbarui");
  };

  const handleDeleteOne = async (sessionId: string) => {
    await supabase.from("student_answers").delete().eq("session_id", sessionId);
    const { error } = await supabase.from("exam_sessions").delete().eq("id", sessionId);
    if (error) { toast.error("Gagal menghapus hasil"); return; }
    toast.success("Hasil ujian berhasil dihapus");
    setDeleteTarget(null);
    await fetchPage();
  };

  const handleDeleteFiltered = async () => {
    setBusy(true);
    try {
      const all = await fetchAllFiltered();
      const ids = all.map((r) => r.id);
      if (!ids.length) {
        toast.info("Tidak ada hasil yang dihapus");
        setDeleteAllConfirm(false);
        return;
      }
      const { error: answersError } = await supabase
        .from("student_answers")
        .delete()
        .in("session_id", ids);
      if (answersError) {
        toast.error("Gagal menghapus jawaban siswa — penghapusan dibatalkan");
        await fetchPage();
        return;
      }
      const { error } = await supabase.from("exam_sessions").delete().in("id", ids);
      if (error) {
        toast.error("Penghapusan sesi sebagian gagal — silakan muat ulang dan periksa daftar");
        await fetchPage();
        return;
      }
      toast.success(`${ids.length} hasil ujian berhasil dihapus`);
      setDeleteAllConfirm(false);
      setPage(1);
      await fetchPage();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menghapus hasil");
    } finally {
      setBusy(false);
    }
  };

  const handleExportAll = async () => {
    setBusy(true);
    try {
      const all = await fetchAllFiltered();
      if (!all.length) { toast.error("Tidak ada data untuk diexport"); return; }
      const label = filterClass !== "all"
        ? classes.find((c) => c.id === filterClass)?.name || "kelas"
        : filterSubject !== "all" ? filterSubject : "semua";
      handleExportExcel(all, label);
    } catch (e: any) {
      toast.error(e?.message || "Gagal export data");
    } finally {
      setBusy(false);
    }
  };

  const handleBatchPrint = async () => {
    setBusy(true);
    try {
      const finishedResults = await fetchAllFiltered(true);
      if (!finishedResults.length) { toast.error("Tidak ada hasil selesai untuk dicetak"); return; }
      const uniqueExamIds = [...new Set(finishedResults.map((r) => r.exam_id).filter(Boolean))] as string[];
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("exam_id, point_weight")
        .in("exam_id", uniqueExamIds);
      if (qErr) throw new Error("Gagal memuat bobot soal untuk cetak. Coba lagi.");
      const weightMap = new Map<string, number>();
      (questions || []).forEach((q: any) => {
        weightMap.set(q.exam_id, (weightMap.get(q.exam_id) || 0) + (q.point_weight || 1));
      });

      const printData: ResultData[] = finishedResults.map((r) => {
        const maxScore = weightMap.get(r.exam_id || "") || r.total_questions || 0;
        const pct = maxScore > 0 ? Math.round(((r.score ?? r.correct_answers ?? 0) / maxScore) * 100) : null;
        return {
          has_essay: r.exam_has_essay ?? false,
          student_name: r.student_name,
          class_name: r.class_name,
          exam_title: r.exam_title,
          exam_subject: r.exam_subject,
          score: r.score,
          correct_answers: r.correct_answers,
          total_questions: r.total_questions,
          started_at: r.started_at,
          finished_at: r.finished_at,
          maxScore,
          percentage: pct,
          nisn: r.nisn,
          exam_number: r.exam_number,
          essay_score: r.essay_score,
        };
      });
      setBatchPrintData(printData);
      setBatchPrintOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyiapkan cetak");
    } finally {
      setBusy(false);
    }
  };

  // ---- statistik (seluruh hasil sesuai filter, bukan hanya halaman aktif) ----
  const finishedStats = useMemo(
    () => statsRows.filter((r) => r.finished_at && r.total_questions),
    [statsRows]
  );
  // nilai akhir resmi (memakai point_weight & essay opsional)
  const pctOf = (r: (typeof statsRows)[number]) =>
    calcFinalScore(r.score ?? 0, r.max_score, r.essay_score, r.exam_has_essay).finalScore;

  const finishedCount = finishedStats.length;
  const avgScore = useMemo(() => {
    if (!finishedCount) return null;
    return Math.round(finishedStats.reduce((sum, r) => sum + pctOf(r), 0) / finishedCount);
  }, [finishedStats, finishedCount]);
  const passCount = finishedStats.filter((r) => pctOf(r) >= KKM).length;
  const passRate = finishedCount ? Math.round((passCount / finishedCount) * 100) : null;

  const byClass = useMemo(() => {
    if (filterClass !== "all") return [];
    const map = new Map<string, { name: string; scores: number[] }>();
    finishedStats.forEach((r) => {
      const classId = studentClassRef.current.get(r.student_id) || null;
      const key = classId || "__none__";
      if (!map.has(key)) map.set(key, { name: classId ? classMapRef.current.get(classId) || "-" : "-", scores: [] });
      map.get(key)!.scores.push(pctOf(r));
    });
    return [...map.entries()]
      .map(([, v]) => ({
        name: v.name,
        avg: v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0,
        count: v.scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [finishedStats, filterClass]);

  const bySubject = useMemo(() => {
    if (filterSubject !== "all") return [];
    const map = new Map<string, number[]>();
    finishedStats.forEach((r) => {
      if (!map.has(r.subject)) map.set(r.subject, []);
      map.get(r.subject)!.push(pctOf(r));
    });
    return [...map.entries()]
      .map(([subject, scores]) => ({
        name: subject,
        avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        count: scores.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [finishedStats, filterSubject]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  // jika halaman aktif tidak lagi punya data (mis. setelah hapus), turunkan halaman
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages);
  }, [loading, page, totalPages]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Hasil Siswa</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={totalCount === 0 || busy} onClick={handleExportAll}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={finishedCount === 0 || busy} onClick={handleBatchPrint}>
            <Printer className="h-4 w-4" /> Cetak Hasil ({finishedCount})
          </Button>
          <Button variant="destructive" size="sm" className="gap-2" disabled={totalCount === 0 || busy} onClick={() => setDeleteAllConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Hapus {totalCount > 0 ? `(${totalCount})` : "Semua"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {finishedCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Selesai</p>
              <p className="text-xl font-bold text-foreground">{finishedCount}</p>
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
              <p className="text-xl font-bold text-destructive">{finishedCount - passCount}</p>
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
                      <div className="h-full rounded-full transition-all" style={{ width: `${c.avg}%`, backgroundColor: c.avg >= KKM ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${c.avg >= KKM ? "text-success" : "text-destructive"}`}>{c.avg}</span>
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
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.avg}%`, backgroundColor: s.avg >= KKM ? "hsl(var(--success))" : "hsl(var(--destructive))" }} />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${s.avg >= KKM ? "text-success" : "text-destructive"}`}>{s.avg}</span>
                    <span className="text-xs text-muted-foreground w-14 text-right">({s.count} ujian)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full sm:w-56">
          <Select value={filterExam} onValueChange={setFilterExam}>
            <SelectTrigger><SelectValue placeholder="Semua Ujian" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Ujian</SelectItem>
              {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
        <div className="w-44">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="finished">Selesai</SelectItem>
              <SelectItem value="ongoing">Berlangsung</SelectItem>
              <SelectItem value="need_essay">Perlu Essay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Dari tanggal"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[9.5rem]"
          />
          <span className="text-sm text-muted-foreground">s.d.</span>
          <Input
            type="date"
            aria-label="Sampai tanggal"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[9.5rem]"
          />
        </div>
        <Input
          placeholder="Cari nama siswa atau ujian..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset Filter</Button>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {totalCount} hasil
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive font-medium mb-3">{loadError}</p>
          <Button variant="outline" size="sm" onClick={fetchPage}>Coba lagi</Button>
        </div>
      ) : loading && results.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat hasil ujian...
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Belum ada hasil ujian.
        </div>
      ) : (
        <>
          <div className={`overflow-x-auto rounded-xl border border-border ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Siswa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kelas</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ujian</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mapel</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">PG</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Essay</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Nilai Akhir</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Waktu</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const essay = r.essay_score ?? null;
                  const hasEssay = essay !== null;
                  const res = finalOf(r, r.max_score);
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.student_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.class_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.exam_title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.exam_subject}</td>
                      <td className="px-4 py-3 text-center">
                        {r.finished_at ? `${r.correct_answers ?? "-"}/${r.total_questions ?? "-"}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasEssay ? <span className="font-bold text-primary">{essay}/25</span> : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-center font-bold ${res ? (res.passed ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>
                        {res ? res.finalScore : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!res ? (
                          <span className="text-xs text-warning">Berlangsung</span>
                        ) : res.essayPending ? (
                          <span className="text-xs text-warning">Perlu essay</span>
                        ) : (
                          <span className={`text-xs font-medium ${res.passed ? "text-success" : "text-destructive"}`}>
                            {res.passed ? "Lulus" : "Tidak Lulus"}
                          </span>
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

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Menampilkan {rangeStart}–{rangeEnd} dari {totalCount} hasil
            </p>
            <div className="flex items-center gap-2">
              <div className="w-28">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / hal</SelectItem>
                    <SelectItem value="50">50 / hal</SelectItem>
                    <SelectItem value="100">100 / hal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="gap-1" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">Hal {page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="gap-1" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Berikutnya <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
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
              <AlertTriangle className="h-5 w-5 text-destructive" /> Hapus {totalCount} Hasil Ujian?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua hasil yang sesuai filter aktif ({totalCount} data) akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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

      <ResultPrinter
        open={batchPrintOpen}
        onOpenChange={setBatchPrintOpen}
        results={batchPrintData}
        onEssayScoreChange={(idx, score) => {
          setBatchPrintData((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], essay_score: score };
            return next;
          });
        }}
      />
    </AdminLayout>
  );
};

export default StudentResults;
