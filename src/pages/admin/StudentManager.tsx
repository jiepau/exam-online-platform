import { useEffect, useState, useRef } from "react";
import { Plus, Users, Upload, Download, FileText } from "lucide-react";
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

interface Student {
  user_id: string;
  full_name: string;
  nisn: string | null;
  created_at: string;
}

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, nisn, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    if (profiles) setStudents(profiles as Student[]);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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
      body: { students: [{ nisn, full_name: fullName, password }] },
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
        fetchStudents();
      }
    }
    setLoading(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      
      // Skip header line
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
        };
      }).filter((s) => s.nisn && s.full_name && s.password);

      if (studentsToImport.length === 0) {
        toast.error("Tidak ada data siswa valid dalam file. Pastikan format: NISN,Nama,Password");
        return;
      }

      setLoading(true);
      toast.info(`Mengimport ${studentsToImport.length} siswa...`);

      const res = await supabase.functions.invoke("register-student", {
        body: { students: studentsToImport },
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
    const csv = `NISN,Nama Lengkap,Password
1234567890,Ahmad Fauzi,password123
0987654321,Siti Aminah,password456
1122334455,Budi Santoso,password789`;
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
      <div className="flex items-center justify-between mb-6">
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        📄 Import siswa massal menggunakan file CSV. <strong>Download template</strong> untuk contoh format. Kolom: NISN, Nama Lengkap, Password
      </p>

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
        {students.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
            Belum ada siswa terdaftar. Import siswa dengan file CSV atau tambah manual.
          </div>
        )}
        {students.map((s) => (
          <div key={s.user_id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {s.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{s.full_name}</p>
              <p className="text-xs text-muted-foreground">
                NISN: <span className="font-mono font-bold text-primary">{s.nisn || "-"}</span> • Terdaftar: {new Date(s.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default StudentManager;
