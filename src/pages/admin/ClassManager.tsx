import { useEffect, useState } from "react";
import { Plus, Pencil, School, Users, Power, PowerOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClassRow {
  id: string;
  name: string;
  grade_level: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = { name: "", grade_level: "", sort_order: "0", is_active: true };

const ClassManager = () => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toggleTarget, setToggleTarget] = useState<ClassRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const [clsRes, profRes] = await Promise.all([
      supabase.from("classes").select("id, name, grade_level, is_active, sort_order").order("sort_order").order("name"),
      supabase.from("profiles").select("class_id"),
    ]);

    if (clsRes.error) {
      setError("Gagal memuat data kelas. Coba muat ulang halaman.");
      setLoading(false);
      return;
    }

    setClasses((clsRes.data ?? []) as ClassRow[]);
    const map: Record<string, number> = {};
    (profRes.data ?? []).forEach((p: { class_id: string | null }) => {
      if (p.class_id) map[p.class_id] = (map[p.class_id] ?? 0) + 1;
    });
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: String(classes.length) });
    setDialogOpen(true);
  };

  const openEdit = (row: ClassRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      grade_level: row.grade_level ?? "",
      sort_order: String(row.sort_order ?? 0),
      is_active: row.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Nama kelas wajib diisi");
      return;
    }
    const duplicate = classes.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editing?.id,
    );
    if (duplicate) {
      toast.error("Nama kelas sudah digunakan");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      grade_level: form.grade_level.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const { error: err } = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);

    setSaving(false);
    if (err) {
      toast.error(editing ? "Gagal menyimpan perubahan" : "Gagal menambah kelas");
      return;
    }
    toast.success(editing ? "Kelas diperbarui" : "Kelas ditambahkan");
    setDialogOpen(false);
    fetchData();
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    const next = !toggleTarget.is_active;
    const { error: err } = await supabase
      .from("classes")
      .update({ is_active: next })
      .eq("id", toggleTarget.id);
    setToggleTarget(null);
    if (err) {
      toast.error("Gagal mengubah status kelas");
      return;
    }
    toast.success(next ? "Kelas diaktifkan" : "Kelas dinonaktifkan");
    fetchData();
  };

  const activeCount = classes.filter((c) => c.is_active).length;
  const assignedStudents = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Manajemen Kelas</h2>
            <p className="text-sm text-muted-foreground">
              Kelola rombel setiap tahun tanpa mengubah data siswa yang sudah ada.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Kelas
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={School} title="Total Kelas" value={classes.length} loading={loading} />
          <StatCard icon={Power} title="Kelas Aktif" value={activeCount} loading={loading} />
          <StatCard icon={Users} title="Siswa Terdaftar Kelas" value={assignedStudents} loading={loading} />
        </div>

        {error && (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchData}>Coba lagi</Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat data kelas...
            </CardContent>
          </Card>
        ) : classes.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <School className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Belum ada kelas</p>
                <p className="text-sm text-muted-foreground">Tambahkan rombel seperti 7A, 7B, 8A, 9A.</p>
              </div>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Tambah Kelas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Nama Kelas</th>
                      <th className="px-4 py-3">Tingkat</th>
                      <th className="px-4 py-3">Urutan</th>
                      <th className="px-4 py-3">Jumlah Siswa</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c) => (
                      <tr key={c.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.grade_level || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.sort_order}</td>
                        <td className="px-4 py-3 text-muted-foreground">{counts[c.id] ?? 0}</td>
                        <td className="px-4 py-3">
                          <Badge variant={c.is_active ? "default" : "secondary"}>
                            {c.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setToggleTarget(c)}>
                              {c.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {classes.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tingkat {c.grade_level || "—"} · {counts[c.id] ?? 0} siswa
                        </p>
                      </div>
                      <Badge variant={c.is_active ? "default" : "secondary"}>
                        {c.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1 gap-1" onClick={() => setToggleTarget(c)}>
                        {c.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        {c.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Nama Kelas</Label>
              <Input
                id="class-name"
                placeholder="Contoh: 7A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="class-grade">Tingkat (opsional)</Label>
                <Input
                  id="class-grade"
                  placeholder="7"
                  value={form.grade_level}
                  onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-order">Urutan Tampil</Label>
                <Input
                  id="class-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Kelas Aktif</p>
                <p className="text-xs text-muted-foreground">Kelas nonaktif tetap menyimpan histori siswa.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => !o && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? "Nonaktifkan kelas ini?" : "Aktifkan kelas ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `Kelas "${toggleTarget?.name}" tidak dihapus. Data siswa dan histori ujian tetap utuh.`
                : `Kelas "${toggleTarget?.name}" akan kembali ditandai aktif.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default ClassManager;
