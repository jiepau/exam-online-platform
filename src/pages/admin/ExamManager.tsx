import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Eye, Upload, FileText, ImagePlus, Download } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MathText from "@/components/exam/MathText";
import { exportToExcel } from "@/lib/exportExcel";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export type QuestionType = "multiple_choice" | "true_false" | "multiple_select" | "short_answer" | "matching";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar / Salah",
  multiple_select: "PG Kompleks",
  short_answer: "Isian Singkat",
  matching: "Menjodohkan",
};

interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number;
  token: string;
  is_active: boolean;
  created_at: string;
  academic_year: string | null;
}

interface QuestionForm {
  question_text: string;
  options: string[];
  correct_answer: number;
  image_url?: string;
  question_type: QuestionType;
  correct_answer_data?: any;
  point_weight: number;
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
  const [academicYear, setAcademicYear] = useState("");
  const [questionsDialog, setQuestionsDialog] = useState<string | null>(null);
  const [questions, setQuestions] = useState<(QuestionForm & { id?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const fetchExams = async () => {
    const { data } = await supabase.from("exams").select("*").order("created_at", { ascending: false });
    if (data) setExams(data as Exam[]);
  };

  useEffect(() => { fetchExams(); }, []);

  const resetForm = () => {
    setTitle(""); setSubject(""); setDuration(60); setToken(""); setAcademicYear(""); setEditingExam(null);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !token) { toast.error("Mohon isi semua kolom"); return; }
    setLoading(true);
    if (editingExam) {
      const { error } = await supabase.from("exams").update({ title, subject, duration, token, academic_year: academicYear || null }).eq("id", editingExam.id);
      if (error) toast.error(error.message);
      else { toast.success("Ujian berhasil diperbarui"); setShowCreate(false); resetForm(); fetchExams(); }
    } else {
      const { error } = await supabase.from("exams").insert({ title, subject, duration, token, academic_year: academicYear || null, created_by: user?.id });
      if (error) toast.error(error.message);
      else { toast.success("Ujian berhasil dibuat"); setShowCreate(false); resetForm(); fetchExams(); }
    }
    setLoading(false);
  };

  const handleToggleActive = async (exam: Exam) => {
    const { error } = await supabase.from("exams").update({ is_active: !exam.is_active }).eq("id", exam.id);
    if (error) toast.error(error.message); else fetchExams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus ujian ini?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ujian dihapus"); fetchExams(); }
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam); setTitle(exam.title); setSubject(exam.subject);
    setDuration(exam.duration); setToken(exam.token); setAcademicYear(exam.academic_year || ""); setShowCreate(true);
  };

  const openQuestions = async (examId: string) => {
    setQuestionsDialog(examId);
    const { data } = await supabase.from("questions").select("*").eq("exam_id", examId).order("sort_order");
    if (data) {
      setQuestions(data.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options as string[],
        correct_answer: q.correct_answer,
        image_url: q.image_url || undefined,
        question_type: q.question_type || "multiple_choice",
        correct_answer_data: q.correct_answer_data || undefined,
        point_weight: q.point_weight ?? 1,
      })));
    }
  };

  const addQuestion = (type: QuestionType = "multiple_choice") => {
    const defaults: Record<QuestionType, Partial<QuestionForm>> = {
      multiple_choice: { options: ["", "", "", ""], correct_answer: 0 },
      true_false: { options: ["Benar", "Salah"], correct_answer: 0 },
      multiple_select: { options: ["", "", "", ""], correct_answer: 0, correct_answer_data: [] },
      short_answer: { options: [], correct_answer: 0, correct_answer_data: { answer: "", aliases: [] } },
      matching: { options: ["|", "|", "|"], correct_answer: 0, correct_answer_data: null },
    };
    setQuestions((prev) => [...prev, { question_text: "", question_type: type, image_url: undefined, point_weight: 1, ...defaults[type] } as QuestionForm]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
    ));
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) => prev.map((q, i) =>
      i === qIndex ? { ...q, options: [...q.options, q.question_type === "matching" ? "|" : ""] } : q
    ));
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newOpts = q.options.filter((_, j) => j !== oIndex);
      // Adjust correct_answer if needed
      let newCorrect = q.correct_answer;
      if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
        if (oIndex === q.correct_answer) newCorrect = 0;
        else if (oIndex < q.correct_answer) newCorrect--;
      }
      // Adjust correct_answer_data for multiple_select
      let newData = q.correct_answer_data;
      if (q.question_type === "multiple_select" && Array.isArray(q.correct_answer_data)) {
        newData = q.correct_answer_data
          .filter((idx: number) => idx !== oIndex)
          .map((idx: number) => (idx > oIndex ? idx - 1 : idx));
      }
      return { ...q, options: newOpts, correct_answer: newCorrect, correct_answer_data: newData };
    }));
  };

  const toggleMultiSelectAnswer = (qIndex: number, oIndex: number) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const current: number[] = Array.isArray(q.correct_answer_data) ? [...q.correct_answer_data] : [];
      const idx = current.indexOf(oIndex);
      if (idx >= 0) current.splice(idx, 1); else current.push(oIndex);
      return { ...q, correct_answer_data: current.sort() };
    }));
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadQuestionImage = async (qIndex: number, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${questionsDialog}/${Date.now()}_${qIndex}.${ext}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast.error("Gagal upload gambar: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(path);
    updateQuestion(qIndex, "image_url", urlData.publicUrl);
    toast.success("Gambar berhasil diupload");
  };

  const parseWordText = (text: string): QuestionForm[] => {
    const questions: QuestionForm[] = [];
    const qBlocks = text.split(/(?=^\d+[.)]\s)/m).filter((b) => b.trim());
    for (const block of qBlocks) {
      const lines = block.trim().split("\n").filter((l) => l.trim());
      if (lines.length < 2) continue;
      const questionText = lines[0].replace(/^\d+[.)]\s*/, "").trim();
      const options: string[] = [];
      let correctAnswer = 0;
      let starCount = 0;
      const starredIndices: number[] = [];

      const answerLine = lines.find((l) => /^(jawab(an)?)\s*[:=]\s*.+/i.test(l.trim()));
      if (answerLine && lines.length <= 3) {
        const answer = answerLine.replace(/^(jawab(an)?)\s*[:=]\s*/i, "").trim();
        questions.push({
          question_text: questionText,
          options: [],
          correct_answer: 0,
          question_type: "short_answer",
          correct_answer_data: { answer, aliases: [] },
          point_weight: 1,
        });
        continue;
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const optMatch = line.match(/^([A-Fa-f])[.)]\s*(.*)/);
        if (optMatch) {
          let optText = optMatch[2].trim();
          if (optText.endsWith("*") || optText.startsWith("*")) {
            starredIndices.push(options.length);
            starCount++;
            optText = optText.replace(/\*/g, "").trim();
          }
          options.push(optText);
        }
      }

      if (options.length < 2) continue;

      const isTrueFalse = options.length === 2 &&
        /^(benar|betul|true|b)$/i.test(options[0]) &&
        /^(salah|false|s)$/i.test(options[1]);

      if (isTrueFalse) {
        questions.push({
          question_text: questionText,
          options: ["Benar", "Salah"],
          correct_answer: starredIndices.length > 0 ? starredIndices[0] : 0,
          question_type: "true_false",
          point_weight: 1,
        });
        continue;
      }

      if (starCount > 1) {
        while (options.length < 4) options.push("");
        questions.push({
          question_text: questionText,
          options,
          correct_answer: 0,
          question_type: "multiple_select",
          correct_answer_data: starredIndices,
          point_weight: 1,
        });
        continue;
      }

      correctAnswer = starredIndices.length > 0 ? starredIndices[0] : 0;
      while (options.length < 4) options.push("");
      questions.push({
        question_text: questionText,
        options: options.slice(0, Math.max(4, options.length)),
        correct_answer: correctAnswer,
        question_type: "multiple_choice",
        point_weight: 1,
      });
    }
    return questions;
  };

  const parseDocxHtml = (html: string): QuestionForm[] => {
    const blocks: string[] = [];
    const blockRegex = /<(li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    const decode = (s: string) => s
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(html)) !== null) {
      const inner = decode(
        m[2].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
      );
      const cleaned = inner.split("\n").map((l) => l.replace(/[\t ]+/g, " ").trim()).filter(Boolean);
      if (cleaned.length) blocks.push(cleaned.join("\n"));
    }

    type Opt = { letter: string | null; text: string; star: boolean };
    type Q = { text: string; opts: Opt[]; shortAnswer?: string };
    const qs: Q[] = [];
    const optStart = /^([A-Fa-f])[.)]\s*(.*)$/;
    const mkOpt = (letter: string | null, raw: string): Opt => {
      const star = /\*/.test(raw);
      return { letter, text: raw.replace(/\*/g, "").trim(), star };
    };

    for (const block of blocks) {
      const lines = block.split("\n");
      const firstOpt = lines[0].match(optStart);
      const prev = qs[qs.length - 1];

      // Continuation block starting with "C." / "D." that belongs to previous question
      if (firstOpt && prev && prev.opts.length > 0 && prev.opts.length < 6) {
        for (const line of lines) {
          const mm = line.match(optStart);
          if (mm) prev.opts.push(mkOpt(mm[1].toUpperCase(), mm[2]));
        }
        continue;
      }

      // Auto-lettered continuation option (Word restarted numbering for each option)
      if (!firstOpt && lines.length === 1 && prev && prev.opts.length < 4) {
        const looksLikeQ = /(\.{2,}|:|\?)\s*$/.test(prev.text) ||
          /(adalah|yaitu|berikut|antara lain)\s*\.*\s*$/i.test(prev.text);
        const hasUnlettered = prev.opts.some((o) => o.letter === null);
        if (looksLikeQ || hasUnlettered) {
          prev.opts.push(mkOpt(null, lines[0]));
          continue;
        }
      }

      // New question; inline options split by <br/> -> newlines
      const q: Q = { text: "", opts: [] };
      const qTextLines: string[] = [];
      for (const line of lines) {
        const mm = line.match(optStart);
        if (mm && qTextLines.length > 0) {
          q.opts.push(mkOpt(mm[1].toUpperCase(), mm[2]));
        } else if (/^(jawab(an)?)\s*[:=]\s*.+/i.test(line)) {
          q.shortAnswer = line.replace(/^(jawab(an)?)\s*[:=]\s*/i, "").trim();
        } else {
          qTextLines.push(line);
        }
      }
      q.text = qTextLines.join(" ").replace(/^\d+[.)]\s*/, "").trim();
      if (q.text) qs.push(q);
    }

    return qs
      .filter((q) => q.text && (q.opts.length >= 2 || q.shortAnswer))
      .map<QuestionForm>((q) => {
        if (q.shortAnswer && q.opts.length === 0) {
          return {
            question_text: q.text,
            options: [],
            correct_answer: 0,
            question_type: "short_answer",
            correct_answer_data: { answer: q.shortAnswer, aliases: [] },
            point_weight: 1,
          };
        }
        const starIdx = q.opts.map((o, i) => (o.star ? i : -1)).filter((i) => i >= 0);
        const optTexts = q.opts.map((o) => o.text);
        while (optTexts.length < 4) optTexts.push("");

        const isTF = q.opts.length === 2 &&
          /^(benar|betul|true|b)$/i.test(q.opts[0].text) &&
          /^(salah|false|s)$/i.test(q.opts[1].text);
        if (isTF) {
          return {
            question_text: q.text,
            options: ["Benar", "Salah"],
            correct_answer: starIdx[0] ?? 0,
            question_type: "true_false",
            point_weight: 1,
          };
        }
        if (starIdx.length > 1) {
          return {
            question_text: q.text,
            options: optTexts,
            correct_answer: 0,
            question_type: "multiple_select",
            correct_answer_data: starIdx,
            point_weight: 1,
          };
        }
        return {
          question_text: q.text,
          options: optTexts,
          correct_answer: starIdx[0] ?? 0,
          question_type: "multiple_choice",
          point_weight: 1,
        };
      });
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "json") {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data)) { toast.error("Format JSON tidak valid."); return; }
        const imported: QuestionForm[] = data.map((item: any) => ({
          question_text: item.question_text || item.soal || "",
          options: item.options || item.pilihan || ["", "", "", ""],
          correct_answer: item.correct_answer ?? item.jawaban ?? 0,
          question_type: item.question_type || "multiple_choice",
          correct_answer_data: item.correct_answer_data || undefined,
          point_weight: item.point_weight ?? 1,
        }));
        setQuestions((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} soal berhasil diimport`);
      } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        let imported = parseDocxHtml(htmlResult.value);
        if (imported.length === 0) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          imported = parseWordText(result.value);
        }
        if (imported.length === 0) { toast.error("Tidak ada soal yang terdeteksi."); return; }
        setQuestions((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} soal berhasil diimport dari Word`);
      } else { toast.error("Format file tidak didukung."); }
    } catch { toast.error("Gagal membaca file."); }
    e.target.value = "";
  };

  const downloadGuide = () => {
    const templateText = `PANDUAN PENULISAN SOAL UJIAN
================================================

PETUNJUK PENGISIAN:
- Setiap soal diawali dengan nomor (1. 2. 3. dst)
- Pilihan jawaban ditulis dengan huruf (A. B. C. D.)
- Tandai jawaban benar dengan tanda bintang (*) di akhir pilihan
- Untuk rumus matematika, gunakan format: $rumus$

TIPE SOAL OTOMATIS:
- Pilihan Ganda  : Soal dengan pilihan A-D, satu jawaban bertanda *
- Benar/Salah    : Soal dengan 2 opsi "Benar" dan "Salah"
- PG Kompleks    : Soal dengan lebih dari 1 jawaban bertanda *
- Isian Singkat  : Soal dengan "Jawaban: ..." tanpa pilihan A-D
`;
    const blob = new Blob([templateText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "panduan-soal.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = async () => {
    const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
    const p = (text: string, bold = false) =>
      new Paragraph({ children: [new TextRun({ text, bold })] });
    const h = (text: string) =>
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true })] });

    const blocks: any[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "TEMPLATE SOAL UJIAN", bold: true })] }),
      p("Isi soal sesuai contoh di bawah. Tandai jawaban benar dengan tanda * di akhir pilihan. Hapus soal contoh, lalu tulis soal Anda dengan format yang sama. Untuk rumus matematika gunakan $...$"),
      p(""),
      h("Contoh Pilihan Ganda"),
      p("1. Berapakah hasil dari 2x + 3 = 7?"),
      p("A. 1"), p("B. 2*"), p("C. 3"), p("D. 4"), p(""),
      h("Contoh Benar / Salah"),
      p("2. Matahari terbit dari arah Timur."),
      p("A. Benar*"), p("B. Salah"), p(""),
      h("Contoh PG Kompleks (>1 jawaban benar)"),
      p("3. Manakah yang termasuk bilangan prima?"),
      p("A. 2*"), p("B. 4"), p("C. 5*"), p("D. 9"), p(""),
      h("Contoh Isian Singkat"),
      p("4. Ibukota negara Indonesia adalah..."),
      p("Jawaban: Jakarta"), p(""),
      h("Soal Anda mulai di sini"),
      p("5. Tulis pertanyaan di sini..."),
      p("A. Pilihan A"), p("B. Pilihan B*"), p("C. Pilihan C"), p("D. Pilihan D"),
    ];

    const doc = new Document({ sections: [{ children: blocks }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-soal.docx"; a.click();
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
      question_type: q.question_type,
      correct_answer_data: q.correct_answer_data || null,
      point_weight: q.point_weight || 1,
    }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from("questions").insert(toInsert as any);
      if (error) { toast.error(error.message); setLoading(false); return; }
    }
    toast.success(`${toInsert.length} soal berhasil disimpan`);
    setQuestionsDialog(null);
    setLoading(false);
  };

  const handleExportQuestions = async (exam: Exam) => {
    const { data } = await supabase.from("questions").select("*").eq("exam_id", exam.id).order("sort_order");
    if (!data || data.length === 0) { toast.error("Tidak ada soal untuk diexport"); return; }
    const rows = data.map((q: any, i: number) => {
      const type = q.question_type || "multiple_choice";
      let answer = "";
      if (type === "multiple_choice" || type === "true_false") {
        answer = String.fromCharCode(65 + q.correct_answer);
      } else if (type === "multiple_select") {
        answer = (q.correct_answer_data || []).map((idx: number) => String.fromCharCode(65 + idx)).join(", ");
      } else if (type === "short_answer") {
        answer = q.correct_answer_data?.answer || "";
      } else if (type === "matching") {
        answer = (q.options as string[]).map((o: string) => o.replace("|", " → ")).join("; ");
      }
      return {
        no: i + 1, type: QUESTION_TYPE_LABELS[type as QuestionType] || type,
        question: q.question_text,
        optA: (q.options as string[])[0] || "", optB: (q.options as string[])[1] || "",
        optC: (q.options as string[])[2] || "", optD: (q.options as string[])[3] || "",
        answer,
      };
    });
    await exportToExcel({
      filename: `Soal - ${exam.title}.xlsx`, sheetName: "Soal & Kunci Jawaban",
      columns: [
        { header: "No", key: "no", width: 5 }, { header: "Tipe", key: "type", width: 15 },
        { header: "Soal", key: "question", width: 50 },
        { header: "A", key: "optA", width: 25 }, { header: "B", key: "optB", width: 25 },
        { header: "C", key: "optC", width: 25 }, { header: "D", key: "optD", width: 25 },
        { header: "Kunci Jawaban", key: "answer", width: 20 },
      ],
      rows,
    });
    toast.success("Soal berhasil diexport");
  };

  // Render question editor based on type
  const renderQuestionEditor = (q: QuestionForm & { id?: string }, qi: number) => {
    const type = q.question_type;

    return (
      <div key={qi} className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">Soal {qi + 1}</span>
            <Badge variant="secondary" className="text-xs">{QUESTION_TYPE_LABELS[type]}</Badge>
            {q.point_weight > 1 && (
              <Badge variant="outline" className="text-xs">{q.point_weight} poin</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Select value={type} onValueChange={(v) => {
              const newType = v as QuestionType;
              const defaults: Record<QuestionType, Partial<QuestionForm>> = {
                multiple_choice: { options: q.options.length >= 2 ? q.options : ["", "", "", ""], correct_answer: 0, correct_answer_data: undefined },
                true_false: { options: ["Benar", "Salah"], correct_answer: 0, correct_answer_data: undefined },
                multiple_select: { options: q.options.length >= 2 ? q.options : ["", "", "", ""], correct_answer: 0, correct_answer_data: [] },
                short_answer: { options: [], correct_answer: 0, correct_answer_data: { answer: "", aliases: [] } },
                matching: { options: ["|", "|", "|"], correct_answer: 0, correct_answer_data: null },
              };
              const updates = { ...defaults[newType], question_type: newType };
              setQuestions((prev) => prev.map((item, i) => i === qi ? { ...item, ...updates } : item));
            }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Point weight */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Bobot poin:</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={q.point_weight}
            onChange={(e) => updateQuestion(qi, "point_weight", Math.max(1, Number(e.target.value) || 1))}
            className="h-8 w-20 text-sm"
          />
        </div>

        {/* Question text */}
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
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => imageInputRefs.current[qi]?.click()}>
            <ImagePlus className="h-4 w-4" /> {q.image_url ? "Ganti Gambar" : "Tambah Gambar"}
          </Button>
          {q.image_url && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => updateQuestion(qi, "image_url", undefined)}>
              Hapus Gambar
            </Button>
          )}
          <input ref={(el) => { imageInputRefs.current[qi] = el; }} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadQuestionImage(qi, file); e.target.value = ""; }} />
        </div>
        {q.image_url && (
          <img src={q.image_url} alt={`Gambar soal ${qi + 1}`} className="max-h-48 rounded-lg border border-border object-contain" />
        )}

        {/* Type-specific answer editor */}
        {(type === "multiple_choice" || type === "true_false") && (
          <div className="space-y-3">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-start gap-2">
                <button type="button" onClick={() => updateQuestion(qi, "correct_answer", oi)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors mt-0.5 ${
                    q.correct_answer === oi ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {type === "true_false" ? (oi === 0 ? "B" : "S") : String.fromCharCode(65 + oi)}
                </button>
                <div className="flex-1 space-y-1">
                  {type === "true_false" ? (
                    <span className="text-sm font-medium text-foreground">{opt}</span>
                  ) : (
                    <>
                      <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} className="h-9" />
                      {opt && /\$/.test(opt) && (
                        <div className="rounded-md bg-muted/50 px-3 py-1.5 text-sm border border-border">
                          <MathText text={opt} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                {type === "multiple_choice" && q.options.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qi, oi)} className="text-muted-foreground mt-0.5">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {type === "multiple_choice" && q.options.length < 6 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qi)} className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Tambah Opsi
              </Button>
            )}
          </div>
        )}

        {type === "multiple_select" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Centang semua jawaban yang benar:</p>
            {q.options.map((opt, oi) => {
              const isChecked = Array.isArray(q.correct_answer_data) && q.correct_answer_data.includes(oi);
              return (
                <div key={oi} className="flex items-start gap-2">
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox checked={isChecked} onCheckedChange={() => toggleMultiSelectAnswer(qi, oi)} />
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isChecked ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} className="h-9" />
                    {opt && /\$/.test(opt) && (
                      <div className="rounded-md bg-muted/50 px-3 py-1.5 text-sm border border-border">
                        <MathText text={opt} />
                      </div>
                    )}
                  </div>
                  {q.options.length > 2 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qi, oi)} className="text-muted-foreground mt-0.5">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
            {q.options.length < 6 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qi)} className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Tambah Opsi
              </Button>
            )}
          </div>
        )}

        {type === "short_answer" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Jawaban Benar</label>
              <Input
                value={q.correct_answer_data?.answer || ""}
                onChange={(e) => updateQuestion(qi, "correct_answer_data", { ...q.correct_answer_data, answer: e.target.value })}
                placeholder="Ketik jawaban yang benar"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Jawaban Alternatif (opsional, satu per baris)</label>
              <Textarea
                value={(q.correct_answer_data?.aliases || []).join("\n")}
                onChange={(e) => updateQuestion(qi, "correct_answer_data", {
                  ...q.correct_answer_data,
                  aliases: e.target.value.split("\n").filter((a: string) => a.trim()),
                })}
                placeholder="Variasi jawaban yang diterima&#10;Contoh:&#10;Indonesia&#10;indonesia&#10;INDONESIA"
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Pencocokan tidak case-sensitive. Tambahkan variasi ejaan jika perlu.
            </p>
           </div>
        )}

        {type === "matching" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Isi pasangan kiri dan kanan. Urutan yang benar adalah pasangan yang sesuai.</p>
            {q.options.map((opt, oi) => {
              const parts = (opt || "").split("|");
              const left = parts[0] || "";
              const right = parts[1] || "";
              return (
                <div key={oi} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {oi + 1}
                  </span>
                  <Input
                    value={left}
                    onChange={(e) => updateOption(qi, oi, `${e.target.value}|${right}`)}
                    placeholder={`Pernyataan ${oi + 1}`}
                    className="h-9 flex-1"
                  />
                  <span className="text-muted-foreground text-sm">→</span>
                  <Input
                    value={right}
                    onChange={(e) => updateOption(qi, oi, `${left}|${e.target.value}`)}
                    placeholder={`Jawaban ${oi + 1}`}
                    className="h-9 flex-1"
                  />
                  {q.options.length > 2 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qi, oi)} className="text-muted-foreground">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
            {q.options.length < 8 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qi)} className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Tambah Pasangan
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Kelola Ujian</h2>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2 exam-gradient border-0">
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
            <div>
              <label className="mb-1 block text-sm font-medium">Tahun Ajaran</label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2024/2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Durasi (menit)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Token Ujian</label>
                <Input value={token} onChange={(e) => setToken(e.target.value.toUpperCase())} placeholder="TOKEN123" className="font-mono tracking-wider" />
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
              <Download className="h-4 w-4" /> Template Soal (.docx)
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadGuide} className="gap-2">
              <FileText className="h-4 w-4" /> Panduan (.txt)
            </Button>
            <input ref={fileInputRef} type="file" accept=".docx,.json" onChange={handleImportQuestions} className="hidden" />
          </div>
          <p className="text-xs text-muted-foreground">
            📄 Import Word/JSON otomatis mendeteksi tipe soal: PG, B/S, PG Kompleks, dan Isian Singkat.
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
          </div>
          <div className="space-y-6">
            {questions.map((q, qi) => renderQuestionEditor(q, qi))}

            {/* Add question buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([type, label]) => (
                <Button key={type} variant="outline" size="sm" onClick={() => addQuestion(type)} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> {label}
                </Button>
              ))}
            </div>

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
                {exam.subject} • {exam.duration} menit{exam.academic_year ? ` • TA ${exam.academic_year}` : ""} • Token:{" "}
                <span className="font-mono font-bold text-primary">{exam.token}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleToggleActive(exam)} title={exam.is_active ? "Nonaktifkan" : "Aktifkan"}>
                {exam.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openQuestions(exam.id)} title="Kelola Soal">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExportQuestions(exam)} title="Export Soal & Kunci">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleEditExam(exam)} title="Edit Ujian">
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
