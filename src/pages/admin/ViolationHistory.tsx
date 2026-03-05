import { useEffect, useState } from "react";
import { ShieldAlert, Search, Filter, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ViolationLog {
  id: string;
  student_id: string;
  student_name: string;
  exam_id: string;
  violation_type: string;
  violation_count: number;
  created_at: string;
}

interface ExamOption {
  id: string;
  title: string;
}

const ViolationHistory = () => {
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExam, setSelectedExam] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      const [violRes, examRes] = await Promise.all([
        supabase
          .from("violation_logs" as any)
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("exams").select("id, title"),
      ]);

      if (violRes.data) setViolations(violRes.data as any);
      if (examRes.data) setExams(examRes.data);
      setLoading(false);
    };
    fetchData();

    // Realtime updates
    const channel = supabase
      .channel("violation-history")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "violation_logs" },
        (payload) => {
          setViolations((prev) => [payload.new as ViolationLog, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Group violations by student+exam
  const filtered = violations.filter((v) => {
    const matchSearch = v.student_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchExam = selectedExam === "all" || v.exam_id === selectedExam;
    return matchSearch && matchExam;
  });

  // Summary: group by student_id to get max violation_count per student
  const studentSummary = new Map<string, { name: string; maxCount: number; totalViolations: number }>();
  filtered.forEach((v) => {
    const existing = studentSummary.get(v.student_id);
    if (!existing) {
      studentSummary.set(v.student_id, { name: v.student_name, maxCount: v.violation_count, totalViolations: 1 });
    } else {
      existing.maxCount = Math.max(existing.maxCount, v.violation_count);
      existing.totalViolations += 1;
    }
  });

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getExamTitle = (examId: string) => {
    return exams.find((e) => e.id === examId)?.title || examId;
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Riwayat Pelanggaran</h2>
          <p className="text-sm text-muted-foreground">Monitor pelanggaran anti-cheat per siswa dan per ujian</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Total Pelanggaran</p>
          <p className="text-3xl font-bold text-foreground mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Siswa Terlibat</p>
          <p className="text-3xl font-bold text-foreground mt-1">{studentSummary.size}</p>
        </div>
        <div className="rounded-xl bg-card p-5 shadow-sm border border-border">
          <p className="text-sm text-muted-foreground">Siswa Kritis (≥2)</p>
          <p className="text-3xl font-bold text-destructive mt-1">
            {Array.from(studentSummary.values()).filter((s) => s.maxCount >= 2).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-full sm:w-64">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter ujian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Ujian</SelectItem>
            {exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Memuat data pelanggaran...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-2 text-success" />
            <p className="text-sm">Tidak ada pelanggaran ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Ujian</TableHead>
                  <TableHead>Jenis Pelanggaran</TableHead>
                  <TableHead className="text-center">Ke-</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v, idx) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{v.student_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {getExamTitle(v.exam_id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className={`h-3.5 w-3.5 ${v.violation_count >= 2 ? "text-destructive" : "text-warning"}`} />
                        <span className="text-sm">{v.violation_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={v.violation_count >= 4 ? "destructive" : v.violation_count >= 3 ? "secondary" : "outline"}>
                        {v.violation_count}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(v.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ViolationHistory;
