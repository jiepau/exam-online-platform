import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Upload, X } from "lucide-react";
import logoMadrasah from "@/assets/logo-madrasah.png";

interface Student {
  user_id: string;
  full_name: string;
  nisn: string | null;
  class_id: string | null;
}

interface ExamCardPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  getClassName: (classId: string | null) => string;
}

const ExamCardPrinter = ({ open, onOpenChange, students, getClassName }: ExamCardPrinterProps) => {
  const [examTitle, setExamTitle] = useState("PENILAIAN AKHIR SEMESTER (PAS)");
  const [room, setRoom] = useState("");
  const [examDate, setExamDate] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [startNumber, setStartNumber] = useState(1);
  const [examNumbers, setExamNumbers] = useState<Record<string, string>>({});
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu Ujian</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 11px; }
          .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .card {
            border: 1.5px solid #000;
            padding: 10px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .card-logo { width: 40px; height: 40px; object-fit: contain; }
          .card-title { text-align: center; flex: 1; }
          .card-title h3 { font-size: 11px; font-weight: bold; margin-bottom: 1px; }
          .card-title p { font-size: 9px; }
          .card-exam-title {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 4px 0;
            text-decoration: underline;
          }
          .card-body table { width: 100%; font-size: 11px; }
          .card-body td { padding: 2px 4px; vertical-align: top; }
          .card-body td:first-child { width: 80px; font-weight: bold; }
          .card-footer {
            margin-top: 8px;
            text-align: right;
            font-size: 10px;
          }
          .signature-area { height: 50px; display: flex; align-items: flex-end; justify-content: center; }
          .signature-img { max-height: 45px; max-width: 100px; }
          .principal-name { font-weight: bold; text-decoration: underline; }
          @media print {
            .cards-grid { gap: 6px; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Cetak Kartu Ujian
          </DialogTitle>
        </DialogHeader>

        {/* Editable Fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Judul Ujian</Label>
            <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="PENILAIAN AKHIR SEMESTER" />
          </div>
          <div>
            <Label>Ruangan</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ruang 1" />
          </div>
          <div>
            <Label>Tanggal Ujian</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <Label>Nama Kepala Sekolah</Label>
            <Input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} placeholder="H. Ahmad, S.Pd.I" />
          </div>
          <div>
            <Label>Kota</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" />
          </div>
          <div>
            <Label>Nomor Ujian Mulai Dari</Label>
            <Input type="number" min={1} value={startNumber} onChange={(e) => {
              const val = Number(e.target.value) || 1;
              setStartNumber(val);
              // Reset manual overrides when start number changes
              setExamNumbers({});
            }} placeholder="1" />
          </div>
        </div>

        {/* Signature Upload */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Upload TTD Kepsek
          </Button>
          <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
          {signatureUrl && (
            <div className="relative">
              <img src={signatureUrl} alt="TTD" className="h-12 border rounded" />
              <button onClick={() => setSignatureUrl(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">{students.length} siswa akan dicetak (2 kartu per baris)</p>
          <Button onClick={handlePrint} className="gap-2 exam-gradient border-0">
            <Printer className="h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>

        {/* Editable Exam Numbers Table */}
        <div className="mb-4 max-h-[30vh] overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nama</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kelas</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">No. Ujian</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.user_id} className="border-t border-border">
                  <td className="px-3 py-1.5 text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-1.5">{student.full_name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{getClassName(student.class_id)}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      className="h-7 w-20 text-center text-sm"
                      value={examNumbers[student.user_id] ?? String(startNumber + index).padStart(2, "0")}
                      onChange={(e) => setExamNumbers(prev => ({ ...prev, [student.user_id]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Print Preview */}
        <div className="border rounded-lg p-4 bg-white text-black overflow-auto max-h-[50vh]">
          <div ref={printRef}>
            <div className="cards-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {students.map((student, index) => (
                <div key={student.user_id} style={{ border: "1.5px solid #000", padding: "10px", breakInside: "avoid", fontSize: "11px", fontFamily: "'Times New Roman', serif" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1.5px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
                    <img src={logoMadrasah} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "11px", fontWeight: "bold" }}>MTS AL WATHONIYAH 43</div>
                      <div style={{ fontSize: "9px" }}>KARTU PESERTA UJIAN</div>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", margin: "4px 0", textDecoration: "underline" }}>
                    {examTitle}
                  </div>

                  {/* Student Info */}
                  <table style={{ width: "100%", fontSize: "11px" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "80px", fontWeight: "bold", padding: "2px 4px" }}>Nama</td>
                        <td style={{ padding: "2px 4px" }}>: {student.full_name}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "2px 4px" }}>NISN</td>
                        <td style={{ padding: "2px 4px" }}>: {student.nisn || "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "2px 4px" }}>Kelas</td>
                        <td style={{ padding: "2px 4px" }}>: {getClassName(student.class_id)}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "2px 4px" }}>Ruangan</td>
                        <td style={{ padding: "2px 4px" }}>: {room || "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold", padding: "2px 4px" }}>No. Ujian</td>
                        <td style={{ padding: "2px 4px" }}>: {examNumbers[student.user_id] ?? String(startNumber + index).padStart(2, "0")}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer - Date & Signature */}
                  <div style={{ marginTop: "8px", textAlign: "right", fontSize: "10px" }}>
                    {examDate && (
                      <div>{city}, {new Date(examDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                    )}
                    <div>Kepala Madrasah,</div>
                    <div style={{ height: "50px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                      {signatureUrl && <img src={signatureUrl} alt="TTD" style={{ maxHeight: "45px", maxWidth: "100px" }} />}
                    </div>
                    {principalName && <div style={{ fontWeight: "bold", textDecoration: "underline" }}>{principalName}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamCardPrinter;
