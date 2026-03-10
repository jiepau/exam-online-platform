import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import logoMadrasah from "@/assets/logo-madrasah.png";

interface ResultData {
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
  passed: boolean;
  nisn?: string;
  exam_number?: string;
}

interface ResultPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ResultData;
}

const ResultPrinter = ({ open, onOpenChange, result }: ResultPrinterProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppSettings();

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hasil Ujian - ${result.student_name}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; background: white; }
          .page { width: 100%; max-width: 170mm; margin: 0 auto; }
          
          /* Header / Kop Surat */
          .header { display: flex; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 3px double #1a1a1a; margin-bottom: 20px; }
          .header img { width: 70px; height: 70px; object-fit: contain; }
          .header-text { flex: 1; text-align: center; }
          .header-text h1 { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .header-text h2 { font-size: 13pt; font-weight: bold; margin-top: 2px; }
          .header-text p { font-size: 9pt; margin-top: 4px; color: #444; }
          
          /* Title */
          .doc-title { text-align: center; margin: 20px 0 16px; }
          .doc-title h3 { font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }
          .doc-title p { font-size: 10pt; color: #555; margin-top: 4px; }
          
          /* Info Table */
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .info-table td { padding: 4px 8px; font-size: 11pt; vertical-align: top; }
          .info-table .label { width: 140px; font-weight: normal; }
          .info-table .colon { width: 12px; }
          .info-table .value { font-weight: normal; }
          
          /* Score Box */
          .score-section { margin: 24px 0; }
          .score-table { width: 100%; border-collapse: collapse; border: 1.5px solid #1a1a1a; }
          .score-table th, .score-table td { border: 1px solid #1a1a1a; padding: 8px 12px; font-size: 11pt; text-align: center; }
          .score-table th { background: #f0f0f0; font-weight: bold; font-size: 10pt; text-transform: uppercase; }
          .score-big { font-size: 20pt; font-weight: bold; }
          .score-pass { color: #16a34a; }
          .score-fail { color: #dc2626; }
          
          /* Status badge */
          .status-badge { display: inline-block; padding: 4px 16px; border-radius: 4px; font-size: 11pt; font-weight: bold; margin-top: 12px; }
          .status-pass { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
          .status-fail { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
          
          /* Notes */
          .notes { margin-top: 24px; font-size: 10pt; color: #555; }
          .notes p { margin-bottom: 4px; }
          
          /* Footer / Signature */
          .footer-sign { display: flex; justify-content: flex-end; margin-top: 40px; }
          .sign-block { text-align: center; width: 200px; }
          .sign-block .city-date { font-size: 10pt; margin-bottom: 60px; }
          .sign-block .name { font-size: 11pt; font-weight: bold; border-top: 1px solid #1a1a1a; padding-top: 4px; }
          .sign-block .role { font-size: 9pt; color: #555; margin-top: 2px; }
          
          /* Watermark-like branding */
          .brand-footer { text-align: center; margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #aaa; }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Cetak Hasil Ujian
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handlePrint} className="gap-2 exam-gradient border-0">
            <Printer className="h-4 w-4" /> Cetak / Print
          </Button>
        </div>

        {/* Print preview */}
        <div className="border border-border rounded-lg p-6 bg-white text-black overflow-auto">
          <div ref={printRef}>
            <div className="page">
              {/* Kop Surat */}
              <div className="header">
                <img src={settings.school_logo_url || logoMadrasah} alt="Logo" style={{ width: 70, height: 70, objectFit: "contain" }} />
                <div className="header-text">
                  <h1>{settings.school_name}</h1>
                  <h2>Laporan Hasil Ujian</h2>
                  <p>Platform Ujian Daring ExON (Exam Online)</p>
                </div>
                <img src={settings.school_logo_url || logoMadrasah} alt="Logo" style={{ width: 70, height: 70, objectFit: "contain", opacity: 0 }} />
              </div>

              {/* Document Title */}
              <div className="doc-title">
                <h3>Laporan Hasil Ujian Siswa</h3>
              </div>

              {/* Student Info */}
              <table className="info-table">
                <tbody>
                  <tr>
                    <td className="label">Nama Siswa</td>
                    <td className="colon">:</td>
                    <td className="value"><strong>{result.student_name}</strong></td>
                  </tr>
                  {result.nisn && (
                    <tr>
                      <td className="label">NISN</td>
                      <td className="colon">:</td>
                      <td className="value">{result.nisn}</td>
                    </tr>
                  )}
                  {result.exam_number && (
                    <tr>
                      <td className="label">No. Ujian</td>
                      <td className="colon">:</td>
                      <td className="value">{result.exam_number}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="label">Kelas</td>
                    <td className="colon">:</td>
                    <td className="value">{result.class_name}</td>
                  </tr>
                  <tr>
                    <td className="label">Mata Pelajaran</td>
                    <td className="colon">:</td>
                    <td className="value">{result.exam_subject}</td>
                  </tr>
                  <tr>
                    <td className="label">Nama Ujian</td>
                    <td className="colon">:</td>
                    <td className="value">{result.exam_title}</td>
                  </tr>
                  <tr>
                    <td className="label">Tanggal Ujian</td>
                    <td className="colon">:</td>
                    <td className="value">{formatDate(result.started_at)}</td>
                  </tr>
                  <tr>
                    <td className="label">Waktu Pengerjaan</td>
                    <td className="colon">:</td>
                    <td className="value">
                      {formatDateTime(result.started_at)}
                      {result.finished_at && ` — ${formatDateTime(result.finished_at)}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Score Table */}
              <div className="score-section">
                <table className="score-table">
                  <thead>
                    <tr>
                      <th>Jumlah Soal</th>
                      <th>Jawaban Benar</th>
                      <th>Skor Didapat</th>
                      <th>Skor Maksimal</th>
                      <th>Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: "14pt", fontWeight: "bold" }}>{result.total_questions ?? "-"}</td>
                      <td style={{ fontSize: "14pt", fontWeight: "bold" }}>{result.correct_answers ?? "-"}</td>
                      <td className={`score-big ${result.passed ? "score-pass" : "score-fail"}`}>
                        {result.score ?? "-"}
                      </td>
                      <td style={{ fontSize: "14pt", fontWeight: "bold" }}>{result.maxScore}</td>
                      <td className={`score-big ${result.passed ? "score-pass" : "score-fail"}`}>
                        {result.percentage !== null ? `${result.percentage}%` : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ textAlign: "center" }}>
                  <span className={`status-badge ${result.passed ? "status-pass" : "status-fail"}`}>
                    {result.passed ? "✓ LULUS" : "✗ TIDAK LULUS"}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="notes">
                <p><strong>Keterangan:</strong></p>
                <p>• Batas kelulusan (KKM): 70%</p>
                <p>• Dokumen ini dicetak secara otomatis oleh sistem ujian daring ExON</p>
                <p>• Hasil ini bersifat resmi dan dapat digunakan sebagai arsip penilaian</p>
              </div>

              {/* Signature */}
              <div className="footer-sign">
                <div className="sign-block">
                  <div className="city-date">Jakarta, {today}</div>
                  <div className="name">Guru Mata Pelajaran</div>
                  <div className="role">{result.exam_subject}</div>
                </div>
              </div>

              {/* Branding */}
              <div className="brand-footer">
                Dicetak melalui ExON (Exam Online) — {settings.school_name} — {today}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResultPrinter;
