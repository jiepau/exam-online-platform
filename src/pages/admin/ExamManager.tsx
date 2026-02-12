import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Textarea } from "@/components/ui/textarea";
import MathText from "@/components/exam/MathText";

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  token: string;
  is_active: boolean;
  created_at: string;
}

interface QuestionForm {
  question_text: string;
  options: string[];
  correct_answer: number;
}

const ExamManager = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(60);
  const [token, setToken] = useState("");
  const [questionsDialog, setQuestionsDialog] = useState<string | null>(null);
  const [questions, setQuestions] = useState<(QuestionForm & { id?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExams = async () => {
    const { data } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
    if (data) setExams(data as Exam[]);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setDuration(60);
    setToken("");
    setEditingExam(null);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !token) {
      toast.error("Mohon isi semua kolom");
      return;
    }

    setLoading(true);

    if (editingExam) {
      const { error } = await supabase.from("exams").update({ title, subject, duration, token }).eq("id", editingExam.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Ujian berhasil diperbarui");
        setShowCreate(false);
        resetForm();
        fetchExams();
      }
    } else {
      const { error } = await supabase.from("exams").insert({
        title,
        subject,
        duration,
        token,
        created_by: user?.id,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Ujian berhasil dibuat");
        setShowCreate(false);
        resetForm();
        fetchExams();
      }
    }
    setLoading(false);
  };

  const handleToggleActive = async (exam: Exam) => {
    const { error } = await supabase.from("exams").update({ is_active: !exam.is_active }).eq("id", exam.id);
    if (error) toast.error(error.message);
    else fetchExams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus ujian ini?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Ujian dihapus");
      fetchExams();
    }
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setSubject(exam.subject);
    setDuration(exam.duration);
    setToken(exam.token);
    setShowCreate(true);
  };

  // Questions management
  const openQuestions = async (examId: string) => {
    setQuestionsDialog(examId);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .order("sort_order");
    if (data) {
      setQuestions(
        data.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: q.options as string[],
          correct_answer: q.correct_answer,
        }))
      );
    }
  };

  const addEmptyQuestion = () => {
    setQuestions((prev) => [...prev, { question_text: "", options: ["", "", "", ""], correct_answer: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q
      )
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportQuestions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data)) {
          toast.error("Format file tidak valid. Harus berupa array JSON.");
          return;
        }
        const imported: QuestionForm[] = data.map((item: any) => ({
          question_text: item.question_text || item.soal || "",
          options: item.options || item.pilihan || ["", "", "", ""],
          correct_answer: item.correct_answer ?? item.jawaban ?? 0,
        }));
        setQuestions((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} soal berhasil diimport`);
      } catch {
        toast.error("File JSON tidak valid");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const template = [
      {
        question_text: "Berapakah hasil dari $2x + 3 = 7$, nilai $x$ adalah...",
        options: ["1", "2", "3", "4"],
        correct_answer: 1,
      },
      {
        question_text: "اختر الترجمة الصحيحة لكلمة 'كتاب'",
        options: ["Buku", "Pena", "Meja", "Kursi"],
        correct_answer: 0,
      },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-soal.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveQuestions = async () => {
    if (!questionsDialog) return;
    setLoading(true);

    await supabase.from("questions").delete().eq("exam_id", questionsDialog);

    const toInsert = questions.map((q, i) => ({
      exam_id: questionsDialog,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      sort_order: i,
    }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("questions").insert(toInsert);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    }

    toast.success(`${toInsert.length} soal berhasil disimpan`);
    setQuestionsDialog(null);
    setLoading(false);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Kelola Ujian</h2>
        <Button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="gap-2 exam-gradient border-0"
        >
          <Plus className="h-4 w-4" /> Buat Ujian
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Ujian" : "Buat Ujian Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveExam} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Judul Ujian</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ujian Literasi Kelas X" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mata Pelajaran</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Bahasa Indonesia" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Durasi (menit)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Token Ujian</label>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="TOKEN123"
                  className="font-mono tracking-wider"
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full exam-gradient border-0">
              {loading ? "Menyimpan..." : "Simpan Ujian"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Questions Dialog */}
      <Dialog open={!!questionsDialog} onOpenChange={(open) => !open && setQuestionsDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Soal</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> Import Soal (JSON)
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportQuestions}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Gunakan <code className="bg-muted px-1 rounded">$...$</code> untuk rumus matematika inline, <code className="bg-muted px-1 rounded">$$...$$</code> untuk block. Teks Arab otomatis RTL.
          </p>
          <div className="space-y-6">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">Soal {qi + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Tulis pertanyaan... (gunakan $rumus$ untuk matematika)"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(qi, "question_text", e.target.value)}
                  rows={3}
                />
                {q.question_text && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="text-xs text-muted-foreground mb-1 block">Preview:</span>
                    <MathText text={q.question_text} />
                  </div>
                )}
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, "correct_answer", oi)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          q.correct_answer === oi
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + oi)}`}
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addEmptyQuestion} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Tambah Soal
            </Button>
            <Button onClick={handleSaveQuestions} disabled={loading} className="w-full exam-gradient border-0">
              {loading ? "Menyimpan..." : "Simpan Semua Soal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exams List */}
      <div className="space-y-3">
        {exams.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Belum ada ujian. Klik "Buat Ujian" untuk memulai.
          </div>
        )}
        {exams.map((exam) => (
          <div key={exam.id} className="rounded-xl bg-card border border-border p-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{exam.title}</h3>
              <p className="text-sm text-muted-foreground">
                {exam.subject} • {exam.duration} menit • Token:{" "}
                <span className="font-mono font-bold text-primary">{exam.token}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleToggleActive(exam)} title={exam.is_active ? "Nonaktifkan" : "Aktifkan"}>
                {exam.is_active ? (
                  <ToggleRight className="h-5 w-5 text-success" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openQuestions(exam.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleEditExam(exam)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(exam.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default ExamManager;
