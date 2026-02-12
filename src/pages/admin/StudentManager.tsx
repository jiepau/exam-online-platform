import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
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
  created_at: string;
}

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    // Get all student user_ids
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
      .select("user_id, full_name, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    if (profiles) setStudents(profiles);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("Mohon isi semua kolom");
      return;
    }
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const res = await supabase.functions.invoke("register-student", {
      body: { email, password, full_name: fullName },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || "Gagal mendaftarkan siswa");
    } else {
      toast.success(`Siswa ${fullName} berhasil didaftarkan`);
      setShowCreate(false);
      setFullName("");
      setEmail("");
      setPassword("");
      fetchStudents();
    }
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Kelola Siswa</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2 exam-gradient border-0">
          <Plus className="h-4 w-4" /> Tambah Siswa
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daftarkan Siswa Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmad Fauzi" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siswa@example.com" />
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
            Belum ada siswa terdaftar.
          </div>
        )}
        {students.map((s) => (
          <div key={s.user_id} className="rounded-xl bg-card border border-border p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {s.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{s.full_name}</p>
              <p className="text-xs text-muted-foreground">Terdaftar: {new Date(s.created_at).toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default StudentManager;
