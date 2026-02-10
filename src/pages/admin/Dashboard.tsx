import { useEffect, useState } from "react";
import { FileText, Users, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({ exams: 0, activeExams: 0, sessions: 0, students: 0 });

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
        students: 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Ujian", value: stats.exams, icon: FileText, color: "text-primary" },
    { label: "Ujian Aktif", value: stats.activeExams, icon: Clock, color: "text-warning" },
    { label: "Sesi Ujian", value: stats.sessions, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
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
    </AdminLayout>
  );
};

export default Dashboard;
