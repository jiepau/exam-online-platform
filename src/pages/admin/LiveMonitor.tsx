import { useEffect, useState, useCallback } from "react";
import { Eye, RefreshCw, Users, CheckCircle2, Clock, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface DraftRow {
  student_id: string;
  exam_id: string;
  answers: Record<string, number>;
  flagged_indices: number[];
  current_index: number;
  updated_at: string;
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  className: string;
  examTitle: string;
  examId: string;
  answered: number;
  totalQuestions: number;
  flagged: number;
  currentQuestion: number;
  lastActivity: string;
}

const LiveMonitor = () => {
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [exams, setExams] = useState<{ id: string; title: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch all drafts
    let query = supabase.from("draft_answers" as any).select("*");
    if (selectedExam !== "all") {
      query = query.eq("exam_id", selectedExam);
    }
    const { data: drafts } = await query;

    if (!drafts || drafts.length === 0) {
      setProgress([]);
      setLoading(false);
      setLastRefresh(new Date());
      return;
    }

    const draftRows = drafts as unknown as DraftRow[];

    // Get unique student & exam IDs
    const studentIds = [...new Set(draftRows.map((d) => d.student_id))];
    const examIds = [...new Set(draftRows.map((d) => d.exam_id))];

    // Fetch profiles, exams, question counts in parallel
    const [profilesRes, examsRes, ...questionCounts] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, class_id").in("user_id", studentIds),
      supabase.from("exams").select("id, title").in("id", examIds),
      ...examIds.map((eid) =>
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("exam_id", eid)
      ),
    ]);

    // Build lookup maps
    const profileMap = new Map<string, { full_name: string; class_id: string | null }>();
    (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p));

    const examMap = new Map<string, string>();
    (examsRes.data || []).forEach((e: any) => examMap.set(e.id, e.title));

    const questionCountMap = new Map<string, number>();
    examIds.forEach((eid, idx) => {
      questionCountMap.set(eid, questionCounts[idx]?.count || 0);
    });

    // Fetch class names
    const classIds = [...new Set([...profileMap.values()].map((p) => p.class_id).filter(Boolean))] as string[];
    const classMap = new Map<string, string>();
    if (classIds.length > 0) {
      const { data: classes } = await supabase.from("classes").select("id, name").in("id", classIds);
      (classes || []).forEach((c: any) => classMap.set(c.id, c.name));
    }

    // Check which students already submitted (have exam_sessions with finished_at)
    const { data: finishedSessions } = await supabase
      .from("exam_sessions")
      .select("student_id, exam_id")
      .in("student_id", studentIds)
      .not("finished_at", "is", null);

    const finishedSet = new Set(
      (finishedSessions || []).map((s: any) => `${s.student_id}_${s.exam_id}`)
    );

    // Build progress list (exclude already submitted)
    const result: StudentProgress[] = draftRows
      .filter((d) => !finishedSet.has(`${d.student_id}_${d.exam_id}`))
      .map((d) => {
        const profile = profileMap.get(d.student_id);
        const answeredCount = Object.keys(d.answers || {}).length;
        const total = questionCountMap.get(d.exam_id) || 0;

        return {
          studentId: d.student_id,
          studentName: profile?.full_name || "Siswa",
          className: profile?.class_id ? classMap.get(profile.class_id) || "-" : "-",
          examTitle: examMap.get(d.exam_id) || "Ujian",
          examId: d.exam_id,
          answered: answeredCount,
          totalQuestions: total,
          flagged: (d.flagged_indices || []).length,
          currentQuestion: (d.current_index || 0) + 1,
          lastActivity: d.updated_at,
        };
      })
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    setProgress(result);
    setLoading(false);
    setLastRefresh(new Date());
  }, [selectedExam]);

  // Fetch active exams for filter
  useEffect(() => {
    const fetchExams = async () => {
      const { data } = await supabase.from("exams").select("id, title").eq("is_active", true);
      if (data) setExams(data);
    };
    fetchExams();
  }, []);

  // Initial fetch & realtime subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("live-progress")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_answers" },
        () => {
          // Debounce: refresh after short delay to batch rapid updates
          setTimeout(fetchData, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const getActivityStatus = (lastActivity: string) => {
    const diff = (Date.now() - new Date(lastActivity).getTime()) / 1000;
    if (diff < 30) return { label: "Aktif", color: "bg-green-500" };
    if (diff < 120) return { label: "Baru saja", color: "bg-yellow-500" };
    return { label: "Tidak aktif", color: "bg-muted-foreground" };
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const activeCount = progress.filter(
    (p) => (Date.now() - new Date(p.lastActivity).getTime()) / 1000 < 120
  ).length;

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Monitor Pengerjaan</h2>
          <p className="text-sm text-muted-foreground">
            Pantau progress pengerjaan ujian siswa secara real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter ujian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Ujian</SelectItem>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sedang Mengerjakan</p>
              <p className="text-3xl font-bold text-foreground mt-1">{progress.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeCount}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-success">
              <Wifi className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Terakhir Diperbarui</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-warning">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Table */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Progress Siswa</h3>
            <p className="text-xs text-muted-foreground">Data diperbarui otomatis setiap ada perubahan</p>
          </div>
        </div>

        {progress.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Belum ada siswa yang sedang mengerjakan ujian</p>
            <p className="text-xs mt-1">Progress akan muncul otomatis saat siswa mulai mengerjakan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Siswa</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Kelas</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Ujian</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Progress</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Soal Saat Ini</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Ragu</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {progress.map((p) => {
                  const pct = p.totalQuestions > 0 ? Math.round((p.answered / p.totalQuestions) * 100) : 0;
                  const status = getActivityStatus(p.lastActivity);
                  return (
                    <tr key={`${p.studentId}_${p.examId}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.studentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.className}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{p.examTitle}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-32">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {p.answered}/{p.totalQuestions}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{p.currentQuestion}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.flagged > 0 ? (
                          <Badge variant="outline" className="text-warning border-warning/30">
                            {p.flagged}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${status.color}`} />
                          <span className="text-xs">{status.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(p.lastActivity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LiveMonitor;
