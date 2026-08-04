import { useEffect, useState } from "react";
import { UserCog, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Teacher {
  user_id: string;
  full_name: string;
  nip: string | null;
  nuptk: string | null;
  subject: string | null;
  created_at: string;
}

const emptyForm = { full_name: "", email: "", password: "", nip: "", nuptk: "", subject: "" };

const TeacherManager = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);

  const fetchTeachers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
    const ids = (roles || []).map((r) => r.user_id);
    if (ids.length === 0) {
      setTeachers([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, nip, nuptk, subject, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    setTeachers((data as Teacher[]) || []);
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const update = (key: keyof typeof emptyForm, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Nama, email, dan password wajib diisi");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-teacher", {
      body: { action: "create", ...form },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Gagal membuat akun guru");
      return;
    }
    toast.success("Akun guru berhasil dibuat");
    setForm(emptyForm);
    setShowCreate(false);
    fetchTeachers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { data, error } = await supabase.functions.invoke("manage-teacher", {
      body: { action: "delete", user_id: target.user_id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Gagal menghapus akun guru");
      return;
    }
    toast.success("Akun guru dihapus");
    fetchTeachers();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kelola Guru</h2>
          <p className="text-sm text-muted-foreground">
            Guru hanya dapat mengakses ujian, soal, dan hasil siswa dari ujian yang dibuatnya sendiri.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="exam-gradient border-0 gap-2">
          <Plus className="h-4 w-4" /> Tambah Guru
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <UserCog className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Daftar Guru</h3>
          <Badge variant="secondary" className="ml-auto">{teachers.length} guru</Badge>
        </div>
        {teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShieldCheck className="mb-2 h-10 w-10" />
            <p className="text-sm">Belum ada akun guru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Nama</th>
                  <th className="px-6 py-3">NIP / NIK</th>
                  <th className="px-6 py-3">NUPTK</th>
                  <th className="px-6 py-3">Mata Pelajaran</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((t) => (
                  <tr key={t.user_id} className="hover:bg-muted/40">
                    <td className="px-6 py-3 font-medium text-foreground">{t.full_name}</td>
                    <td className="px-6 py-3 font-mono text-muted-foreground">{t.nip || "-"}</td>
                    <td className="px-6 py-3 font-mono text-muted-foreground">{t.nuptk || "-"}</td>
                    <td className="px-6 py-3 text-muted-foreground">{t.subject || "-"}</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun Guru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            {([
              { key: "full_name", label: "Nama Lengkap", type: "text" },
              { key: "email", label: "Email", type: "email" },
              { key: "password", label: "Password (min. 8 karakter)", type: "password" },
              { key: "nip", label: "NIP / NIK (opsional)", type: "text" },
              { key: "nuptk", label: "NUPTK / PEGID (opsional)", type: "text" },
              { key: "subject", label: "Mata Pelajaran (opsional)", type: "text" },
            ] as const).map(({ key, label, type }) => (
              <div key={key}>
                <Label className="mb-1 block">{label}</Label>
                <Input
                  type={type}
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </div>
            ))}
            <Button type="submit" disabled={loading} className="w-full exam-gradient border-0">
              {loading ? "Memproses..." : "Buat Akun Guru"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deleteTarget?.full_name}</strong> akan dihapus permanen. Ujian dan soal yang
              dibuatnya tetap tersimpan dan hanya bisa dikelola oleh Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default TeacherManager;
