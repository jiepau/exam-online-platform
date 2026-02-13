import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, Upload, FileText, ImagePlus } from "lucide-react";
import mammoth from "mammoth";
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
  image_url?: string;
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
  const imageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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
          image_url: q.image_url || undefined,
        }))
      );
    }
  };

  const addEmptyQuestion = () => {
    setQuestions((prev) => [...prev, { question_text: "", options: ["", "", "", ""], correct_answer: 0, image_url: undefined }]);
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

  const parseWordText = (text: string): QuestionForm[] => {
    const questions: QuestionForm[] = [];
    // Split by question numbers: 1. or 1) 
    const qBlocks = text.split(/(?=^\d+[.)]\s)/m).filter((b) => b.trim());

    for (const block of qBlocks) {
      const lines = block.trim().split("\n").filter((l) => l.trim());
      if (lines.length < 2) continue;

      // First line is question (remove number prefix)
      const questionText = lines[0].replace(/^\d+[.)]\s*/, "").trim();

      const options: string[] = [];
      let correctAnswer = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match A. B. C. D. or A) B) C) D) patterns
        const optMatch = line.match(/^([A-Da-d])[.)]\s*(.*)/);
        if (optMatch) {
          let optText = optMatch[2].trim();
          // Check if marked as correct with * at end or start
          if (optText.endsWith("*") || optText.startsWith("*")) {
            correctAnswer = options.length;
            optText = optText.replace(/\*/g, "").trim();
          }
          options.push(optText);
        }
      }

      if (options.length >= 2) {
        // Pad to 4 options if needed
        while (options.length < 4) options.push("");
        questions.push({ question_text: questionText, options: options.slice(0, 4), correct_answer: correctAnswer });
      }
    }
    return questions;
  };

  const handleUploadQuestionImage = async (qIndex: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${questionsDialog}/${Date.now()}_${qIndex}.${ext}`;
    const { data, error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) {
      toast.error("Gagal upload gambar: " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(path);
    updateQuestion(qIndex, "image_url", urlData.publicUrl);
    toast.success("Gambar berhasil diupload");
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "json") {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          toast.error("Format JSON tidak valid.");
          return;
        }
        const imported: QuestionForm[] = data.map((item: any) => ({
          question_text: item.question_text || item.soal || "",
          options: item.options || item.pilihan || ["", "", "", ""],
          correct_answer: item.correct_answer ?? item.jawaban ?? 0,
        }));
        setQuestions((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} soal berhasil diimport`);
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const imported = parseWordText(result.value);
        if (imported.length === 0) {
          toast.error("Tidak ada soal yang terdeteksi. Pastikan format sesuai template.");
          return;
        }
        setQuestions((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} soal berhasil diimport dari Word`);
      } else {
        toast.error("Format file tidak didukung. Gunakan .docx atau .json");
      }
    } catch {
      toast.error("Gagal membaca file. Periksa format file Anda.");
    }
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const templateText = `TEMPLATE SOAL UJIAN - MTS Al Wathoniyah 43
================================================

PETUNJUK PENGISIAN:
- Setiap soal diawali dengan nomor (1. 2. 3. dst)
- Pilihan jawaban ditulis dengan huruf (A. B. C. D.)
- Tandai jawaban benar dengan tanda bintang (*) di akhir pilihan
- Untuk rumus matematika, gunakan format: $rumus$
- Teks Bahasa Arab bisa langsung ditulis

================================================

1. Berapakah hasil dari 2x + 3 = 7, maka nilai x adalah...
A. 1
B. 2*
C. 3
D. 4

2. Hasil dari 15 x 8 adalah...
A. 100
B. 110
C. 120*
D. 130

3. اختر الترجمة الصحيحة لكلمة "كتاب"
A. Buku*
B. Pena
C. Meja
D. Kursi

4. Apa arti dari kata "مَدْرَسَةٌ"?
A. Rumah
B. Masjid
C. Sekolah*
D. Pasar
`;
    const blob = new Blob([templateText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-soal.txt";
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
      image_url: q.image_url || null,
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
              <Upload className="h-4 w-4" /> Import Soal
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <FileText className="h-4 w-4" /> Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.json"
              onChange={handleImportQuestions}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            📄 Support format: <strong>Word (.docx)</strong> dan JSON. Download template untuk contoh format. Tandai jawaban benar dengan tanda <strong>*</strong>
          </p>
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">📐 Panduan Penulisan Rumus Matematika (LaTeX):</p>
            <p>Gunakan tanda <code className="bg-muted px-1 rounded">$...$</code> untuk rumus inline. Contoh:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><code className="bg-muted px-1 rounded">$1\frac{"{3}{4}"}$</code> → 1¾</li>
              <li><code className="bg-muted px-1 rounded">$\frac{"{a}{b}"}$</code> → pecahan a/b</li>
              <li><code className="bg-muted px-1 rounded">$x^2 + y^2 = z^2$</code> → pangkat</li>
              <li><code className="bg-muted px-1 rounded">$\sqrt{"{x}"}$</code> → akar kuadrat</li>
              <li><code className="bg-muted px-1 rounded">$\times$</code> → tanda kali (×)</li>
              <li><code className="bg-muted px-1 rounded">$\div$</code> → tanda bagi (÷)</li>
            </ul>
            <p className="mt-1">Contoh soal: <code className="bg-muted px-1 rounded text-foreground">Hasil dari $1\frac{"{3}{4}"} : 2\frac{"{1}{4}"} + 1\frac{"{1}{3}"}$ adalah ...</code></p>
          </div>
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
                {/* Image upload */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => imageInputRefs.current[qi]?.click()}
                  >
                    <ImagePlus className="h-4 w-4" /> {q.image_url ? "Ganti Gambar" : "Tambah Gambar"}
                  </Button>
                  {q.image_url && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => updateQuestion(qi, "image_url", undefined)}>
                      Hapus Gambar
                    </Button>
                  )}
                  <input
                    ref={(el) => { imageInputRefs.current[qi] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadQuestionImage(qi, file);
                      e.target.value = "";
                    }}
                  />
                </div>
                {q.image_url && (
                  <img src={q.image_url} alt={`Gambar soal ${qi + 1}`} className="max-h-48 rounded-lg border border-border object-contain" />
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
