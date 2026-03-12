import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cloud, CloudOff, CheckCircle, Clock, WifiOff, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Exam {
  id: string;
  title: string;
  subject: string;
  is_active: boolean;
}

interface StudentSync {
  userId: string;
  name: string;
  className: string;
  nisn: string;
  status: "submitted" | "drafting" | "not_started";
  lastSync: string | null;
  answeredCount: number;
  totalQuestions: number;
}

const SyncStatus = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [students, setStudents] = useState<StudentSync[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Fetch exams
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("exams")
        .select("id, title, subject, is_active")
        .order("created_at", { ascending: false });
      if (data) {
        setExams(data);
        const active = data.find((e) => e.is_active);
        if (active) setSelectedExam(active.id);
        else if (data.length > 0) setSelectedExam(data[0].id);
      }
    };
    fetch();
  }, []);

  const loadSyncData = async () => {
    if (!selectedExam) return;
    setLoading(true);

    try {
      // Fetch all students
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const studentIds = (roles || []).map((r) => r.user_id);

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch profiles, sessions, drafts, and question count in parallel
      const [profilesRes, sessionsRes, draftsRes, questionsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, nisn, class_id")
          .in("user_id", studentIds),
        supabase
          .from("exam_sessions")
          .select("student_id, finished_at, score")
          .eq("exam_id", selectedExam),
        supabase
          .from("draft_answers")
          .select("student_id, answers, updated_at")
          .eq("exam_id", selectedExam),
        supabase
          .from("questions")
          .select("id")
          .eq("exam_id", selectedExam),
      ]);

      // Fetch classes
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name");
      const classMap = new Map((classes || []).map((c) => [c.id, c.name]));

      const profiles = profilesRes.data || [];
      const sessions = sessionsRes.data || [];
      const drafts = draftsRes.data || [];
      const qCount = (questionsRes.data || []).length;
      setTotalQuestions(qCount);

      const sessionMap = new Map(sessions.map((s) => [s.student_id, s]));
      const draftMap = new Map(drafts.map((d: any) => [d.student_id, d]));

      const result: StudentSync[] = profiles.map((p) => {
        const session = sessionMap.get(p.user_id);
        const draft = draftMap.get(p.user_id);

        let status: StudentSync["status"] = "not_started";
        let lastSync: string | null = null;
        let answeredCount = 0;

        if (session && session.finished_at) {
          status = "submitted";
          lastSync = session.finished_at;
          answeredCount = qCount;
        } else if (draft) {
          status = "drafting";
          lastSync = (draft as any).updated_at;
          const answers = (draft as any).answers;
          if (answers && typeof answers === "object") {
            answeredCount = Object.keys(answers).filter((k) => {
              const v = answers[k];
              if (typeof v === "string") return v.trim().length > 0;
              if (Array.isArray(v)) return v.length > 0;
              return v !== undefined && v !== null;
            }).length;
          }
        }

        return {
          userId: p.user_id,
          name: p.full_name,
          className: classMap.get(p.class_id || "") || "-",
          nisn: p.nisn || "-",
          status,
          lastSync,
          answeredCount,
          totalQuestions: qCount,
        };
      });

      // Sort: drafting first, then not_started, then submitted
      const order = { drafting: 0, not_started: 1, submitted: 2 };
      result.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));

      setStudents(result);
    } catch (e) {
      console.error("Failed to load sync data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, [selectedExam]);

  // Realtime subscription for draft_answers changes
  useEffect(() => {
    if (!selectedExam) return;
    const channel = supabase
      .channel("sync-status-drafts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_answers", filter: `exam_id=eq.${selectedExam}` },
        () => {
          loadSyncData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_sessions", filter: `exam_id=eq.${selectedExam}` },
        () => {
          loadSyncData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExam]);

  const counts = {
    submitted: students.filter((s) => s.status === "submitted").length,
    drafting: students.filter((s) => s.status === "drafting").length,
    notStarted: students.filter((s) => s.status === "not_started").length,
  };

  const statusBadge = (status: StudentSync["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="h-3 w-3" /> Terkirim
          </Badge>
        );
      case "drafting":
        return (
          <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning border-warning/30">
            <WifiOff className="h-3 w-3" /> Belum Sync
          </Badge>
        );
      case "not_started":
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> Belum Mulai
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Cloud className="h-5 w-5" /> Status Sinkronisasi
            </h2>
            <p className="text-sm text-muted-foreground">Pantau status pengiriman jawaban siswa secara real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Pilih Ujian" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} {e.is_active && "🟢"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadSyncData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{counts.submitted}</p>
                <p className="text-sm text-muted-foreground">Sudah Terkirim</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <WifiOff className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{counts.drafting}</p>
                <p className="text-sm text-muted-foreground">Sedang Mengerjakan / Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{counts.notStarted}</p>
                <p className="text-sm text-muted-foreground">Belum Memulai</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detail Siswa ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {selectedExam ? "Tidak ada data siswa" : "Pilih ujian terlebih dahulu"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-left font-medium text-muted-foreground">Nama</th>
                      <th className="pb-3 text-left font-medium text-muted-foreground hidden sm:table-cell">NISN</th>
                      <th className="pb-3 text-left font-medium text-muted-foreground hidden md:table-cell">Kelas</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Progres</th>
                      <th className="pb-3 text-center font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Terakhir Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.userId} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-medium text-foreground">
                          {s.name}
                          <span className="block sm:hidden text-xs text-muted-foreground">{s.className}</span>
                        </td>
                        <td className="py-3 text-muted-foreground hidden sm:table-cell">{s.nisn}</td>
                        <td className="py-3 text-muted-foreground hidden md:table-cell">{s.className}</td>
                        <td className="py-3 text-center">
                          {s.status === "not_started" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    s.status === "submitted" ? "bg-emerald-500" : "bg-warning"
                                  }`}
                                  style={{ width: `${totalQuestions > 0 ? (s.answeredCount / totalQuestions) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {s.answeredCount}/{totalQuestions}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-center">{statusBadge(s.status)}</td>
                        <td className="py-3 text-right text-muted-foreground text-xs hidden sm:table-cell">
                          {s.lastSync
                            ? formatDistanceToNow(new Date(s.lastSync), { addSuffix: true, locale: idLocale })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SyncStatus;
