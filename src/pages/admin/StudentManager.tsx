import { useEffect, useState, useRef } from "react";
import { Plus, Users, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassItem {
  id: string;
  name: string;
}

interface Student {
  user_id: string;
  full_name: string;
  nisn: string | null;
  class_id: string | null;
  created_at: string;
}

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, name").order("sort_order");
    if (data) setClasses(data);
  };

  const fetchStudents = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    if (!roles || roles.length === 0) {
      setStudents([]);
      return;
    }

    const ids = roles.map((r) => r.user_id);
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, nisn, class_id, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    const { data: profiles } = await query;
    if (profiles) setStudents(profiles as Student[]);
  };

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  const filteredStudents = filterClass === "all"
    ? students
    : filterClass === "none"
      ? students.filter((s) => !s.class_id)
      : students.filter((s) => s.class_id === filterClass);

  const getClassName = (classId: string | null) => {
    if (!classId) return "Belum diatur";
    return classes.find((c) => c.id === classId)?.name || "-";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nisn || !password) {
      toast.error("Mohon isi semua kolom");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    const res = await supabase.functions.invoke("register-student", {
      body: { students: [{ nisn, full_name: fullName, password, class_id: selectedClass || null }] },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Gagal mendaftarkan siswa");
    } else {
      const r = res.data.results?.[0];
      if (r && !r.success) {
        toast.error(`Gagal: ${r.error}`);
      } else {
        toast.success(`Siswa ${fullName} berhasil didaftarkan`);
        setShowCreate(false);
        setFullName("");
        setNisn("");
        setPassword("");
        setSelectedClass("");
        fetchStudents();
      }
    }
    setLoading(false);
  };

  const handleClassChange = async (studentUserId: string, classId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ class_id: classId === "none" ? null : classId })
      .eq("user_id", studentUserId);

    if (error) {
      toast.error("Gagal mengubah kelas");
    } else {
      toast.success("Kelas berhasil diubah");
      fetchStudents();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const dataLines = lines.slice(1);
      if (dataLines.length === 0) {
        toast.error("File kosong atau tidak ada data siswa");
        return;
      }

      const studentsToImport = dataLines.map((line) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        return {
          nisn: parts[0] || "",
          full_name: parts[1] || "",
          password: parts[2] || "",
          class_name: parts[3] || "",
        };
      }).filter((s) => s.nisn && s.full_name && s.password);

      if (studentsToImport.length === 0) {
        toast.error("Tidak ada data valid. Format: NISN,Nama,Password,Kelas");
        return;
      }

      // Map class names to IDs
      const mapped = studentsToImport.map((s) => {
        const cls = classes.find((c) => c.name.toLowerCase() === s.class_name.toLowerCase());
        return { nisn: s.nisn, full_name: s.full_name, password: s.password, class_id: cls?.id || null };
      });

      setLoading(true);
      toast.info(`Mengimport ${mapped.length} siswa...`);

      const res = await supabase.functions.invoke("register-student", {
        body: { students: mapped },
      });

      if (res.error) {
        toast.error(res.error.message);
      } else {
        const { registered, total, results } = res.data;
        const failed = results?.filter((r: any) => !r.success) || [];
        if (failed.length > 0) {
          toast.warning(`${registered}/${total} siswa berhasil. ${failed.length} gagal.`);
          failed.forEach((f: any) => toast.error(`NISN ${f.nisn}: ${f.error}`));
        } else {
          toast.success(`${registered} siswa berhasil diimport!`);
        }
        fetchStudents();
      }
      setLoading(false);
    } catch {
      toast.error("Gagal membaca file. Pastikan format CSV benar.");
    }
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const csv = `NISN,Nama Lengkap,Password,Kelas
1234567890,Ahmad Fauzi,password123,Kelas 7
0987654321,Siti Aminah,password456,Kelas 8-1
1122334455,Budi Santoso,password789,Kelas 9-2`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-siswa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Kelola Siswa</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2" disabled={loading}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileText className="h-4 w-4" /> Template
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2 exam-gradient border-0">
            <Plus className="h-4 w-4" /> Tambah Siswa
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleImport} className="hidden" />
      </div>

      {/* Class filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-muted-foreground">Filter Kelas:</span>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            <SelectItem value="none">Belum Ada Kelas</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">({filteredStudents.length} siswa)</span>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daftarkan Siswa Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">NISN</label>
              <Input value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="1234567890" className="font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmad Fauzi" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" />
            </div>
            <Button type="submit" disabled={loading} className="w-full exam-gradient border-0">
              {loading ? "Mendaftarkan..." : "Daftarkan Siswa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {filteredStudents.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
            {filterClass === "all" ? "Belum ada siswa terdaftar." : "Tidak ada siswa di kelas ini."}
          </div>
        )}
        {filteredStudents.map((s) => (
          <div key={s.user_id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {s.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{s.full_name}</p>
              <p className="text-xs text-muted-foreground">
                NISN: <span className="font-mono font-bold text-primary">{s.nisn || "-"}</span> • {new Date(s.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
            <Select value={s.class_id || "none"} onValueChange={(val) => handleClassChange(s.user_id, val)}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum diatur</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default StudentManager;
