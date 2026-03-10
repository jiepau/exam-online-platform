import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Printer } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import logoMadrasah from "@/assets/logo-madrasah.png";

export interface ResultData {
  student_name: string;
  class_name: string;
  exam_title: string;
  exam_subject: string;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  started_at: string;
  finished_at: string | null;
  maxScore: number;
  percentage: number | null;
  nisn?: string;
  exam_number?: string;
  essay_score?: number | null;
}

const ESSAY_MAX = 25; // 5 soal × 5 poin
const KKM = 75;

interface ResultPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ResultData[];
  onEssayScoreChange?: (index: number, score: number | null) => void;
}

const toBase64 = (url: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = url;
  });

const PRINT_CSS = `
  @page { size: A4; margin: 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; background: white; }
  .page { width: 100%; max-width: 170mm; margin: 0 auto; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px double #1a1a1a; margin-bottom: 18px; }
  .header img { width: 65px; height: 65px; object-fit: contain; }
  .header-text { flex: 1; text-align: center; }
  .header-text h1 { font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .header-text h2 { font-size: 12pt; font-weight: bold; margin-top: 2px; }
  .header-text p { font-size: 9pt; margin-top: 3px; color: #444; }
  .header-spacer { width: 65px; }
  .doc-title { text-align: center; margin: 16px 0 14px; }
  .doc-title h3 { font-size: 13pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  .info-table td { padding: 3px 8px; font-size: 11pt; vertical-align: top; }
  .info-table .label { width: 140px; }
  .info-table .colon { width: 12px; }
  .score-section { margin: 20px 0; }
  .score-table { width: 100%; border-collapse: collapse; border: 1.5px solid #1a1a1a; }
  .score-table th, .score-table td { border: 1px solid #1a1a1a; padding: 7px 10px; font-size: 11pt; text-align: center; }
  .score-table th { background: #f0f0f0; font-weight: bold; font-size: 10pt; text-transform: uppercase; }
  .score-big { font-size: 18pt; font-weight: bold; }
  .score-pass { color: #16a34a; }
  .score-fail { color: #dc2626; }
  .status-badge { display: inline-block; padding: 4px 16px; border-radius: 4px; font-size: 11pt; font-weight: bold; margin-top: 12px; }
  .status-pass { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
  .status-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
  .notes { margin-top: 20px; font-size: 10pt; color: #555; }
  .notes p { margin-bottom: 3px; }
  .footer-sign { display: flex; justify-content: flex-end; margin-top: 36px; }
  .sign-block { text-align: center; width: 200px; }
  .sign-block .city-date { font-size: 10pt; margin-bottom: 56px; }
  .sign-block .name { font-size: 11pt; font-weight: bold; border-top: 1px solid #1a1a1a; padding-top: 4px; }
  .sign-block .role { font-size: 9pt; color: #555; margin-top: 2px; }
  .brand-footer { text-align: center; margin-top: 28px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8pt; color: #aaa; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

/** Calculate combined final score scaled to 100 */
export const calcFinalScore = (pgScore: number, pgMax: number, essayScore: number | null | undefined) => {
  const essay = essayScore ?? 0;
  const totalRaw = pgScore + essay;
  const totalMax = pgMax + ESSAY_MAX;
  if (totalMax === 0) return { finalScore: 0, totalRaw, totalMax, passed: false };
  const finalScore = Math.round((totalRaw / totalMax) * 100);
  return { finalScore, totalRaw, totalMax, passed: finalScore >= KKM };
};

const ResultPrinter = ({ open, onOpenChange, results, onEssayScoreChange }: ResultPrinterProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppSettings();
  const [logoBase64, setLogoBase64] = useState("");
  const [localEssayScores, setLocalEssayScores] = useState<(number | null)[]>([]);

  useEffect(() => {
    if (open) {
      const src = settings.school_logo_url || logoMadrasah;
      toBase64(src).then(setLogoBase64);
      setLocalEssayScores(results.map(r => r.essay_score ?? null));
    }
  }, [open, settings.school_logo_url, results]);

  const handleEssayChange = (idx: number, val: string) => {
    const num = val === "" ? null : Math.min(ESSAY_MAX, Math.max(0, parseInt(val) || 0));
    setLocalEssayScores(prev => {
      const next = [...prev];
      next[idx] = num;
      return next;
    });
    onEssayScoreChange?.(idx, num);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Hasil Ujian</title><style>${PRINT_CSS}</style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 500);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const formatDateTime = (d: string) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const today = formatDate(new Date().toISOString());

  const renderPage = (r: ResultData, idx: number) => {
    const essayVal = localEssayScores[idx] ?? 0;
    const pgScore = r.score ?? 0;
    const { finalScore, totalRaw, totalMax, passed } = calcFinalScore(pgScore, r.maxScore, localEssayScores[idx]);

    return (
      <div className="page" key={idx}>
        {/* Kop Surat */}
        <div className="header">
          {logoBase64 && <img src={logoBase64} alt="Logo" />}
          <div className="header-text">
            <h1>{settings.school_name}</h1>
            <h2>Laporan Hasil Ujian</h2>
            <p>Platform Ujian Daring ExON (Exam Online)</p>
          </div>
          <div className="header-spacer" />
        </div>

        <div className="doc-title"><h3>Laporan Hasil Ujian Siswa</h3></div>

        {/* Info */}
        <table className="info-table"><tbody>
          <tr><td className="label">Nama Siswa</td><td className="colon">:</td><td><strong>{r.student_name}</strong></td></tr>
          {r.nisn && <tr><td className="label">NISN</td><td className="colon">:</td><td>{r.nisn}</td></tr>}
          {r.exam_number && <tr><td className="label">No. Ujian</td><td className="colon">:</td><td>{r.exam_number}</td></tr>}
          <tr><td className="label">Kelas</td><td className="colon">:</td><td>{r.class_name}</td></tr>
          <tr><td className="label">Mata Pelajaran</td><td className="colon">:</td><td>{r.exam_subject}</td></tr>
          <tr><td className="label">Nama Ujian</td><td className="colon">:</td><td>{r.exam_title}</td></tr>
          <tr><td className="label">Tanggal Ujian</td><td className="colon">:</td><td>{formatDate(r.started_at)}</td></tr>
          <tr><td className="label">Waktu Pengerjaan</td><td className="colon">:</td><td>{formatDateTime(r.started_at)}{r.finished_at && ` — ${formatDateTime(r.finished_at)}`}</td></tr>
        </tbody></table>

        {/* Skor Detail */}
        <div className="score-section">
          <table className="score-table">
            <thead><tr>
              <th colSpan={3}>Pilihan Ganda</th>
              <th>Essay</th>
              <th colSpan={2}>Nilai Akhir</th>
            </tr>
            <tr>
              <th>Benar</th>
              <th>Skor</th>
              <th>Maks</th>
              <th>Skor / {ESSAY_MAX}</th>
              <th>Total</th>
              <th>Nilai (100)</th>
            </tr></thead>
            <tbody><tr>
              <td style={{ fontSize: "13pt", fontWeight: "bold" }}>{r.correct_answers ?? "-"}/{r.total_questions ?? "-"}</td>
              <td style={{ fontSize: "13pt", fontWeight: "bold" }}>{pgScore}</td>
              <td>{r.maxScore}</td>
              <td style={{ fontSize: "13pt", fontWeight: "bold" }}>{essayVal}</td>
              <td style={{ fontSize: "13pt", fontWeight: "bold" }}>{totalRaw}/{totalMax}</td>
              <td className={`score-big ${passed ? "score-pass" : "score-fail"}`}>{finalScore}</td>
            </tr></tbody>
          </table>

          <div style={{ textAlign: "center" }}>
            <span className={`status-badge ${passed ? "status-pass" : "status-fail"}`}>
              {passed ? `✓ LULUS (KKM: ${KKM})` : `✗ TIDAK LULUS (KKM: ${KKM})`}
            </span>
          </div>
        </div>

        {/* Keterangan */}
        <div className="notes">
          <p><strong>Keterangan:</strong></p>
          <p>• Kriteria Ketuntasan Minimal (KKM): {KKM}</p>
          <p>• Skor PG (Pilihan Ganda) dihitung otomatis oleh sistem, skor Essay diinput manual oleh guru</p>
          <p>• Nilai akhir = (Skor PG + Skor Essay) / {ESSAY_MAX + r.maxScore} × 100</p>
          <p>• Dokumen ini dicetak melalui sistem ujian daring ExON</p>
        </div>

        {/* TTD */}
        <div className="footer-sign">
          <div className="sign-block">
            <div className="city-date">Jakarta, {today}</div>
            <div className="name">Guru Mata Pelajaran</div>
            <div className="role">{r.exam_subject}</div>
          </div>
        </div>

        <div className="brand-footer">
          Dicetak melalui ExON (Exam Online) — {settings.school_name} — {today}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Cetak Hasil Ujian ({results.length} siswa)
          </DialogTitle>
        </DialogHeader>

        {/* Essay score inputs */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Input Nilai Essay (maks {ESSAY_MAX} poin)</p>
            <Button onClick={handlePrint} className="gap-2 exam-gradient border-0">
              <Printer className="h-4 w-4" /> Cetak / Print
            </Button>
          </div>
          {results.length <= 10 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {results.map((r, i) => {
                const essay = localEssayScores[i];
                const { finalScore, passed } = calcFinalScore(r.score ?? 0, r.maxScore, essay);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="truncate flex-1 text-muted-foreground" title={r.student_name}>{r.student_name}</span>
                    <Input
                      type="number" min={0} max={ESSAY_MAX}
                      value={essay ?? ""}
                      onChange={(e) => handleEssayChange(i, e.target.value)}
                      placeholder="0"
                      className="w-16 h-7 text-center text-xs"
                    />
                    <span className={`w-8 text-right font-bold text-xs ${passed ? "text-success" : "text-destructive"}`}>
                      {finalScore}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {results.length > 10 && (
            <p className="text-xs text-muted-foreground">
              {results.length} siswa — nilai essay dapat diinput per siswa di halaman detail masing-masing
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-border rounded-lg p-6 bg-white text-black">
            <div ref={printRef}>
              {results.map((r, i) => renderPage(r, i))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResultPrinter;
