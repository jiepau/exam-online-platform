import { useEffect, useState } from "react";
import { FileText, Users, CheckCircle2, Clock, ShieldAlert, AlertTriangle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import WhatsNewDialog from "@/components/admin/WhatsNewDialog";
import { Badge } from "@/components/ui/badge";

interface ViolationLog {
  id: string;
  student_name: string;
  violation_type: string;
  violation_count: number;
  created_at: string;
  exam_id: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({ exams: 0, activeExams: 0, sessions: 0 });
  const [recentViolations, setRecentViolations] = useState<ViolationLog[]>([]);
  const [newAlert, setNewAlert] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const [examsRes, activeRes, sessionsRes] = await Promise.all([
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("exam_sessions").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        exams: examsRes.count || 0,
        activeExams: activeRes.count || 0,
        sessions: sessionsRes.count || 0,
      });
    };
    fetchStats();

    // Fetch recent violations
    const fetchViolations = async () => {
      const { data } = await supabase
        .from("violation_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setRecentViolations(data as any);
    };
    fetchViolations();

    // Realtime subscription for new violations
    const channel = supabase
      .channel("violation-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "violation_logs" },
        (payload) => {
          const newViolation = payload.new as ViolationLog;
          setRecentViolations((prev) => [newViolation, ...prev].slice(0, 20));
          setNewAlert(true);
          // Play alert sound on admin side
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 520;
            gain.gain.value = 0.2;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
            setTimeout(() => ctx.close(), 500);
          } catch {}
          setTimeout(() => setNewAlert(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    { label: "Total Ujian", value: stats.exams, icon: FileText, color: "text-primary" },
    { label: "Ujian Aktif", value: stats.activeExams, icon: Clock, color: "text-warning" },
    { label: "Sesi Ujian", value: stats.sessions, icon: CheckCircle2, color: "text-success" },
  ];

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <AdminLayout>
      <WhatsNewDialog />
      <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-card p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Realtime Violation Monitor */}
      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${newAlert ? "bg-destructive animate-pulse" : "bg-muted"}`}>
            {newAlert ? <Bell className="h-4 w-4 text-white" /> : <ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Monitor Pelanggaran (Realtime)</h3>
            <p className="text-xs text-muted-foreground">Pelanggaran anti-cheat siswa akan muncul secara otomatis</p>
          </div>
          {recentViolations.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {recentViolations.length} pelanggaran
            </Badge>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recentViolations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-2 text-success" />
              <p className="text-sm">Belum ada pelanggaran terdeteksi</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentViolations.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${v.violation_count >= 2 ? "text-destructive" : "text-warning"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {v.student_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{v.violation_type}</p>
                  </div>
                  <Badge variant={v.violation_count >= 2 ? "destructive" : "secondary"} className="text-xs">
                    {v.violation_count}/3
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(v.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
