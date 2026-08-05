import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Library, Plus, Pencil, Trash2, Search, RotateCcw, User, Star, TrendingUp, Archive, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// NOTE: kolom "status arsip" belum tersedia di database.
// Struktur di bawah sudah disiapkan: set SHOW_ARCHIVE = true saat kolom tersedia.
const SHOW_ARCHIVE = false;

const PAGE_SIZE = 10;

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Pilihan Ganda" },
  { value: "true_false", label: "Benar / Salah" },
  { value: "complex", label: "PG Kompleks" },
  { value: "short_answer", label: "Isian Singkat" },
] as const;

const DIFFICULTIES = [
  { value: "easy", label: "Mudah" },
  { value: "medium", label: "Sedang" },
  { value: "hard", label: "Sulit" },
] as const;

const typeLabel = (v: string) => QUESTION_TYPES.find((t) => t.value === v)?.label ?? v;
const difficultyLabel = (v: string) => DIFFICULTIES.find((d) => d.value === v)?.label ?? v;

interface BankQuestion {
  id: string;
  created_by: string;
  subject: string;
  grade_level: string | null;
  topic: string | null;
  difficulty: string;
  question_type: string;
  question_text: string;
  options: unknown;
  correct_answer: number | null;
  correct_answer_data: unknown;
  point_weight: number;
  tags: string[];
  created_at: string;
}

interface FormState {
  id: string | null;
  subject: string;
  grade_level: string;
  topic: string;
  difficulty: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  complex_answers: number[];
  short_answer: string;
  point_weight: number;
  tags: string;
}

const emptyForm: FormState = {
  id: null,
  subject: "",
  grade_level: "",
  topic: "",
  difficulty: "medium",
  question_type: "multiple_choice",
  question_text: "",
  options: ["", "", "", ""],
  correct_answer: 0,
  complex_answers: [],
  short_answer: "",
  point_weight: 1,
  tags: "",
};

const QuestionBank = () => {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");
  const [subjects, setSubjects] = useState<string[]>([]);

  const [stats, setStats] = useState({ total: 0, mine: 0, hots: 0, archived: 0, used: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankQuestion | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // --- Statistik (efisien: count-only, tanpa transfer baris) ---
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);

    const scoped = () => {
      const q = supabase.from("bank_questions").select("id", { count: "exact", head: true });
      return isAdmin ? q : q.eq("created_by", user.id);
    };

    const [totalRes, mineRes, hotsRes] = await Promise.all([
      scoped(),
      supabase.from("bank_questions").select("id", { count: "exact", head: true }).eq("created_by", user.id),
      scoped().contains("tags", ["HOTS"]),
    ]);

    setStats({
      total: totalRes.count ?? 0,
      mine: mineRes.count ?? 0,
      hots: hotsRes.count ?? 0,
      archived: 0, // menunggu kolom status arsip
      used: 0, // menunggu fitur pemilihan soal dari Bank Soal
    });
    setStatsLoading(false);
  }, [user, isAdmin]);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("bank_questions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (!isAdmin) query = query.eq("created_by", user.id);
    else if (filterOwner === "mine") query = query.eq("created_by", user.id);

    if (filterType !== "all") query = query.eq("question_type", filterType);
    if (filterDifficulty !== "all") query = query.eq("difficulty", filterDifficulty);
    if (filterSubject !== "all") query = query.eq("subject", filterSubject);
    if (debouncedSearch) query = query.ilike("question_text", `%${debouncedSearch}%`);

    const { data, count, error } = await query;
    if (error) {
      toast.error("Gagal memuat bank soal: " + error.message);
      setLoading(false);
      return;
    }

    setQuestions((data ?? []) as unknown as BankQuestion[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [user, isAdmin, page, filterType, filterDifficulty, filterSubject, filterOwner, debouncedSearch]);

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    let q = supabase.from("bank_questions").select("subject");
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    const unique = Array.from(new Set((data ?? []).map((r) => r.subject).filter(Boolean))).sort();
    setSubjects(unique);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchStats();
    fetchSubjects();
  }, [fetchStats, fetchSubjects]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterDifficulty("all");
    setFilterSubject("all");
    setFilterOwner("all");
    setPage(0);
  };

  // --- CRUD ---
  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (q: BankQuestion) => {
    const options = Array.isArray(q.options) ? (q.options as string[]) : [];
    const cad = (q.correct_answer_data ?? {}) as Record<string, unknown>;
    setForm({
      id: q.id,
      subject: q.subject ?? "",
      grade_level: q.grade_level ?? "",
      topic: q.topic ?? "",
      difficulty: q.difficulty ?? "medium",
      question_type: q.question_type ?? "multiple_choice",
      options: options.length ? options : ["", "", "", ""],
      correct_answer: q.correct_answer ?? 0,
      complex_answers: Array.isArray(cad.answers) ? (cad.answers as number[]) : [],
      short_answer: typeof cad.text === "string" ? cad.text : "",
      question_text: q.question_text ?? "",
      point_weight: q.point_weight ?? 1,
      tags: (q.tags ?? []).join(", "),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.question_text.trim()) return toast.error("Teks soal wajib diisi");
    if (!form.subject.trim()) return toast.error("Mata pelajaran wajib diisi");

    const isTF = form.question_type === "true_false";
    const isShort = form.question_type === "short_answer";
    const isComplex = form.question_type === "complex";

    let options: string[] = [];
    if (isTF) options = ["Benar", "Salah"];
    else if (!isShort) options = form.options.map((o) => o.trim()).filter(Boolean);

    if (!isShort && options.length < 2) return toast.error("Minimal 2 pilihan jawaban");
    if (isShort && !form.short_answer.trim()) return toast.error("Kunci jawaban isian wajib diisi");
    if (isComplex && form.complex_answers.length === 0) return toast.error("Pilih minimal satu kunci jawaban");

    let correctAnswerData: Json | null = null;
    if (isShort) correctAnswerData = { text: form.short_answer.trim() };
    else if (isComplex) correctAnswerData = { answers: form.complex_answers.slice().sort((a, b) => a - b) };

    const payload = {
      subject: form.subject.trim(),
      grade_level: form.grade_level.trim() || null,
      topic: form.topic.trim() || null,
      difficulty: form.difficulty,
      question_type: form.question_type,
      question_text: form.question_text.trim(),
      options: options as unknown as Json,
      correct_answer: isShort || isComplex ? null : form.correct_answer,
      correct_answer_data: correctAnswerData,
      point_weight: Number(form.point_weight) || 1,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    setSaving(true);
    const { error } = form.id
      ? await supabase.from("bank_questions").update(payload).eq("id", form.id)
      : await supabase.from("bank_questions").insert([{ ...payload, created_by: user.id }]);

    setSaving(false);

    if (error) return toast.error("Gagal menyimpan: " + error.message);

    toast.success(form.id ? "Soal diperbarui" : "Soal ditambahkan");
    setShowForm(false);
    setForm(emptyForm);
    fetchQuestions();
    fetchStats();
    fetchSubjects();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("bank_questions").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) return toast.error("Gagal menghapus: " + error.message);
    toast.success("Soal dihapus");
    fetchQuestions();
    fetchStats();
  };

  const statCards = useMemo(() => {
    const cards = [
      { icon: Library, title: "Total Soal", value: stats.total, hint: isAdmin ? "Seluruh sistem" : "Koleksi Anda" },
      { icon: User, title: "Soal Saya", value: stats.mine, hint: "Dibuat oleh Anda" },
      { icon: Star, title: "HOTS", value: stats.hots, hint: "Bertag HOTS" },
      ...(SHOW_ARCHIVE ? [{ icon: Archive, title: "Arsip", value: stats.archived, hint: "Tidak aktif" }] : []),
      { icon: TrendingUp, title: "Dipakai di Ujian", value: stats.used, hint: "Minimal 1 ujian" },
    ];
    return cards;
  }, [stats, isAdmin]);

  const isTF = form.question_type === "true_false";
  const isShort = form.question_type === "short_answer";
  const isComplex = form.question_type === "complex";

  return (
    <AdminLayout>
      <div className="animate-fade-in space-y-6">
        {/* Judul halaman */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Library className="h-6 w-6 text-primary" /> Bank Soal
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola koleksi soal yang dapat dipakai ulang pada berbagai ujian.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Tambah Soal
          </Button>
        </div>

        {/* Dashboard ringkas */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((c) => (
            <StatCard key={c.title} {...c} loading={statsLoading} />
          ))}
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipe Soal</Label>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kesulitan</Label>
                <Select value={filterDifficulty} onValueChange={(v) => { setFilterDifficulty(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tingkat</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mata Pelajaran</Label>
                <Select value={filterSubject} onValueChange={(v) => { setFilterSubject(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs">Kepemilikan</Label>
                  <Select value={filterOwner} onValueChange={(v) => { setFilterOwner(v); setPage(0); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Soal</SelectItem>
                      <SelectItem value="mine">Soal Saya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari teks soal..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabel */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px]">Soal</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kesulitan</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Belum ada soal yang sesuai. Tambahkan soal baru untuk memulai koleksi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-[380px]">
                          <p className="line-clamp-2 text-sm text-foreground">{q.question_text}</p>
                          {q.topic && <p className="mt-0.5 text-xs text-muted-foreground">Topik: {q.topic}</p>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{q.subject}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{q.grade_level || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary">{typeLabel(q.question_type)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">{difficultyLabel(q.difficulty)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(q.tags ?? []).slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(q)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "0 soal" : `Menampilkan ${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} dari ${total} soal`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* Form Soal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Soal" : "Tambah Soal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Mata Pelajaran *</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Matematika" />
              </div>
              <div className="space-y-1">
                <Label>Kelas</Label>
                <Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="7" />
              </div>
              <div className="space-y-1">
                <Label>Topik</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Bilangan Bulat" />
              </div>
              <div className="space-y-1">
                <Label>Tingkat Kesulitan</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipe Soal</Label>
                <Select
                  value={form.question_type}
                  onValueChange={(v) => setForm({ ...form, question_type: v, correct_answer: 0, complex_answers: [] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Bobot Poin</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.point_weight}
                  onChange={(e) => setForm({ ...form, point_weight: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Teks Soal *</Label>
              <Textarea
                rows={4}
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                placeholder="Tulis pertanyaan di sini..."
              />
            </div>

            {isShort ? (
              <div className="space-y-1">
                <Label>Kunci Jawaban *</Label>
                <Input value={form.short_answer} onChange={(e) => setForm({ ...form, short_answer: e.target.value })} />
              </div>
            ) : isTF ? (
              <div className="space-y-1">
                <Label>Kunci Jawaban *</Label>
                <Select
                  value={String(form.correct_answer)}
                  onValueChange={(v) => setForm({ ...form, correct_answer: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Benar</SelectItem>
                    <SelectItem value="1">Salah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Pilihan Jawaban {isComplex ? "(centang semua kunci)" : "(pilih satu kunci)"}</Label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {isComplex ? (
                      <Checkbox
                        checked={form.complex_answers.includes(idx)}
                        onCheckedChange={(checked) =>
                          setForm({
                            ...form,
                            complex_answers: checked
                              ? [...form.complex_answers, idx]
                              : form.complex_answers.filter((i) => i !== idx),
                          })
                        }
                      />
                    ) : (
                      <input
                        type="radio"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={form.correct_answer === idx}
                        onChange={() => setForm({ ...form, correct_answer: idx })}
                      />
                    )}
                    <span className="w-5 text-sm font-medium text-muted-foreground">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...form.options];
                        next[idx] = e.target.value;
                        setForm({ ...form, options: next });
                      }}
                      placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                  >
                    Tambah Pilihan
                  </Button>
                  {form.options.length > 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          ...form,
                          options: form.options.slice(0, -1),
                          complex_answers: form.complex_answers.filter((i) => i !== form.options.length - 1),
                          correct_answer: Math.min(form.correct_answer, form.options.length - 2),
                        })
                      }
                    >
                      Hapus Pilihan Terakhir
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Tag (pisahkan dengan koma)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="HOTS, UTS, Semester 1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus soal ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Soal akan dihapus permanen dari bank soal. Tindakan ini tidak dapat dibatalkan.
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

export default QuestionBank;
