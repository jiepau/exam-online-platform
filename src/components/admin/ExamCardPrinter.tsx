import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Upload, X, Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoMadrasah from "@/assets/logo-madrasah.png";

interface Student {
  user_id: string;
  full_name: string;
  nisn: string | null;
  class_id: string | null;
}

interface Room {
  id: string;
  name: string;
  sort_order: number;
}

interface ExamCardPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  getClassName: (classId: string | null) => string;
}

const ExamCardPrinter = ({ open, onOpenChange, students, getClassName }: ExamCardPrinterProps) => {
  const [examTitle, setExamTitle] = useState("PENILAIAN AKHIR SEMESTER (PAS)");
  const [examDate, setExamDate] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalNip, setPrincipalNip] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [startNumber, setStartNumber] = useState(1);
  const [examNumbers, setExamNumbers] = useState<Record<string, string>>({});
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Room management
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // student_id -> room_id
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchRooms();
      fetchAssignments();
    }
  }, [open]);

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").order("sort_order");
    if (data) setRooms(data);
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from("student_room_assignments").select("student_id, room_id");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((a: any) => { map[a.student_id] = a.room_id; });
      setAssignments(map);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    const nextOrder = rooms.length > 0 ? Math.max(...rooms.map(r => r.sort_order)) + 1 : 1;
    const { error } = await supabase.from("rooms").insert({ name: newRoomName.trim(), sort_order: nextOrder });
    if (error) { toast.error("Gagal menambah ruangan"); return; }
    setNewRoomName("");
    fetchRooms();
    toast.success("Ruangan ditambahkan");
  };

  const handleDeleteRoom = async (roomId: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) { toast.error("Gagal menghapus ruangan"); return; }
    setRooms(prev => prev.filter(r => r.id !== roomId));
    // Remove assignments for this room
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === roomId) delete next[k]; });
      return next;
    });
    if (selectedRoom === roomId) setSelectedRoom(null);
    toast.success("Ruangan dihapus");
  };

  const toggleStudentRoom = async (studentId: string, roomId: string) => {
    const current = assignments[studentId];
    if (current === roomId) {
      // Remove assignment
      await supabase.from("student_room_assignments").delete().eq("student_id", studentId);
      setAssignments(prev => { const n = { ...prev }; delete n[studentId]; return n; });
    } else {
      // Upsert assignment
      await supabase.from("student_room_assignments")
        .upsert({ student_id: studentId, room_id: roomId }, { onConflict: "student_id" });
      setAssignments(prev => ({ ...prev, [studentId]: roomId }));
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Get students for a specific room
  const getStudentsInRoom = (roomId: string) =>
    students.filter(s => assignments[s.user_id] === roomId);

  // Students without room assignment
  const unassignedStudents = students.filter(s => !assignments[s.user_id]);

  // Students to print (selected room or all assigned)
  const studentsToPrint = selectedRoom
    ? getStudentsInRoom(selectedRoom)
    : students.filter(s => assignments[s.user_id]);

  const getRoomName = (studentId: string) => {
    const roomId = assignments[studentId];
    return rooms.find(r => r.id === roomId)?.name || "-";
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
            border: 2.5px solid #1a6e3a;
            padding: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            background: linear-gradient(135deg, #f0faf4 0%, #ffffff 40%, #f0faf4 100%);
          }
          .card::before {
            content: '';
            position: absolute;
            top: -30px;
            right: -30px;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(26,110,58,0.08) 0%, transparent 70%);
            border-radius: 50%;
          }
          .card::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: -20px;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(26,110,58,0.06) 0%, transparent 70%);
            border-radius: 50%;
          }
          .card-inner { position: relative; z-index: 1; }
          .card-header {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #1a6e3a;
            padding-bottom: 6px;
            margin-bottom: 6px;
            background: linear-gradient(90deg, rgba(26,110,58,0.05) 0%, transparent 100%);
            margin: -12px -12px 8px -12px;
            padding: 8px 12px;
            border-radius: 6px 6px 0 0;
          }
          .card-logo { width: 40px; height: 40px; object-fit: contain; }
          .card-title { text-align: center; flex: 1; }
          .card-title h3 { font-size: 11px; font-weight: bold; margin-bottom: 1px; color: #1a6e3a; }
          .card-title p { font-size: 9px; color: #2d8a4e; }
          .card-exam-title {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 4px 0 6px;
            text-decoration: underline;
            color: #1a6e3a;
            letter-spacing: 0.5px;
          }
          .card-body table { width: 100%; font-size: 11px; }
          .card-body td { padding: 2px 4px; vertical-align: top; }
          .card-body td:first-child { width: 80px; font-weight: bold; color: #333; }
          .card-footer { margin-top: 8px; text-align: right; font-size: 10px; }
          .corner-accent {
            position: absolute;
            width: 20px;
            height: 20px;
            border-color: #1a6e3a;
          }
          .corner-tl { top: 3px; left: 3px; border-top: 2px solid; border-left: 2px solid; border-radius: 4px 0 0 0; }
          .corner-tr { top: 3px; right: 3px; border-top: 2px solid; border-right: 2px solid; border-radius: 0 4px 0 0; }
          .corner-bl { bottom: 3px; left: 3px; border-bottom: 2px solid; border-left: 2px solid; border-radius: 0 0 0 4px; }
          .corner-br { bottom: 3px; right: 3px; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0 0 4px 0; }
          .signature-area { height: 50px; display: flex; align-items: flex-end; justify-content: center; }
          .signature-img { max-height: 45px; max-width: 100px; }
          .principal-name { font-weight: bold; text-decoration: underline; }
          @media print { .cards-grid { gap: 6px; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <Label>Tanggal Ujian</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <Label>Nama Kepala Sekolah</Label>
            <Input value={principalName} onChange={(e) => setPrincipalName(e.target.value)} placeholder="H. Ahmad, S.Pd.I" />
          </div>
          <div>
            <Label>NIP Kepala Sekolah</Label>
            <Input value={principalNip} onChange={(e) => setPrincipalNip(e.target.value)} placeholder="197001012000011001" className="font-mono" />
          </div>
          <div>
            <Label>Kota</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" />
          </div>
          <div>
            <Label>Nomor Ujian Mulai Dari</Label>
            <Input type="number" min={1} value={startNumber} onChange={(e) => {
              setStartNumber(Number(e.target.value) || 1);
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

        {/* Room Management */}
        <div className="border rounded-lg p-4 mb-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Kelola Ruangan</h3>

          {/* Add Room */}
          <div className="flex gap-2 mb-3">
            <Input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Nama ruangan baru..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddRoom()}
            />
            <Button size="sm" onClick={handleAddRoom} className="gap-1">
              <Plus className="h-3 w-3" /> Tambah
            </Button>
          </div>

          {/* Room list with student assignment */}
          <div className="space-y-2">
            {rooms.map((room) => {
              const roomStudents = getStudentsInRoom(room.id);
              const isExpanded = expandedRoom === room.id;
              return (
                <div key={room.id} className="border rounded-lg bg-background">
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      className="flex items-center gap-2 flex-1 text-left text-sm font-medium"
                      onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {room.name}
                      <span className="text-xs text-muted-foreground">({roomStudents.length} siswa)</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={selectedRoom === room.id ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                      >
                        {selectedRoom === room.id ? "Dipilih" : "Cetak"}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-3 py-2 max-h-48 overflow-y-auto">
                      {students.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Tidak ada siswa.</p>
                      ) : (
                        <div className="space-y-1">
                          {students.map((s) => {
                            const isInThisRoom = assignments[s.user_id] === room.id;
                            const isInOtherRoom = assignments[s.user_id] && assignments[s.user_id] !== room.id;
                            return (
                              <label
                                key={s.user_id}
                                className={`flex items-center gap-2 text-xs py-1 px-2 rounded cursor-pointer hover:bg-muted/50 ${isInOtherRoom ? "opacity-40" : ""}`}
                              >
                                <Checkbox
                                  checked={isInThisRoom}
                                  onCheckedChange={() => toggleStudentRoom(s.user_id, room.id)}
                                  disabled={isInOtherRoom}
                                />
                                <span className="flex-1">{s.full_name}</span>
                                <span className="text-muted-foreground">{getClassName(s.class_id)}</span>
                                {isInOtherRoom && (
                                  <span className="text-muted-foreground italic">
                                    ({rooms.find(r => r.id === assignments[s.user_id])?.name})
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {unassignedStudents.length > 0 && (
            <p className="text-xs text-warning mt-2">⚠ {unassignedStudents.length} siswa belum memiliki ruangan</p>
          )}
        </div>

        {/* Print Controls */}
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-muted-foreground">
            {selectedRoom
              ? `${studentsToPrint.length} siswa di ${rooms.find(r => r.id === selectedRoom)?.name}`
              : `${studentsToPrint.length} siswa (semua yg punya ruangan)`
            }
          </p>
          <Button onClick={handlePrint} disabled={studentsToPrint.length === 0} className="gap-2 exam-gradient border-0">
            <Printer className="h-4 w-4" /> Cetak Sekarang
          </Button>
        </div>

        {/* Editable Exam Numbers */}
        {studentsToPrint.length > 0 && (
          <div className="mb-4 max-h-[25vh] overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nama</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kelas</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ruangan</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">No. Ujian</th>
                </tr>
              </thead>
              <tbody>
                {studentsToPrint.map((student, index) => (
                  <tr key={student.user_id} className="border-t border-border">
                    <td className="px-3 py-1.5 text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-1.5">{student.full_name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{getClassName(student.class_id)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{getRoomName(student.user_id)}</td>
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
        )}

        {/* Print Preview */}
        <div className="border rounded-lg p-4 bg-white text-black overflow-auto max-h-[40vh]">
          <div ref={printRef}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {studentsToPrint.map((student, index) => (
                <div key={student.user_id} style={{
                  border: "2.5px solid #1a6e3a",
                  padding: "12px",
                  breakInside: "avoid",
                  fontSize: "11px",
                  fontFamily: "'Times New Roman', serif",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #f0faf4 0%, #ffffff 40%, #f0faf4 100%)"
                }}>
                  {/* Corner accents */}
                  <div style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderTop: "2px solid #1a6e3a", borderLeft: "2px solid #1a6e3a", borderRadius: "4px 0 0 0" }} />
                  <div style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderTop: "2px solid #1a6e3a", borderRight: "2px solid #1a6e3a", borderRadius: "0 4px 0 0" }} />
                  <div style={{ position: "absolute", bottom: 3, left: 3, width: 20, height: 20, borderBottom: "2px solid #1a6e3a", borderLeft: "2px solid #1a6e3a", borderRadius: "0 0 0 4px" }} />
                  <div style={{ position: "absolute", bottom: 3, right: 3, width: 20, height: 20, borderBottom: "2px solid #1a6e3a", borderRight: "2px solid #1a6e3a", borderRadius: "0 0 4px 0" }} />
                  {/* Decorative circles */}
                  <div style={{ position: "absolute", top: -30, right: -30, width: 80, height: 80, background: "radial-gradient(circle, rgba(26,110,58,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
                  <div style={{ position: "absolute", bottom: -20, left: -20, width: 60, height: 60, background: "radial-gradient(circle, rgba(26,110,58,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      borderBottom: "2px solid #1a6e3a", paddingBottom: "6px", marginBottom: "8px",
                      background: "linear-gradient(90deg, rgba(26,110,58,0.05) 0%, transparent 100%)",
                      margin: "-12px -12px 8px -12px", padding: "8px 12px",
                      borderRadius: "6px 6px 0 0"
                    }}>
                      <img src={logoMadrasah} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1a6e3a" }}>MTS AL WATHONIYAH 43</div>
                        <div style={{ fontSize: "9px", color: "#2d8a4e" }}>KARTU PESERTA UJIAN</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", margin: "4px 0 6px", textDecoration: "underline", color: "#1a6e3a", letterSpacing: "0.5px" }}>
                      {examTitle}
                    </div>
                    <table style={{ width: "100%", fontSize: "11px" }}>
                      <tbody>
                        <tr><td style={{ width: "80px", fontWeight: "bold", padding: "2px 4px", color: "#333" }}>Nama</td><td style={{ padding: "2px 4px" }}>: {student.full_name}</td></tr>
                        <tr><td style={{ fontWeight: "bold", padding: "2px 4px", color: "#333" }}>NISN</td><td style={{ padding: "2px 4px" }}>: {student.nisn || "-"}</td></tr>
                        <tr><td style={{ fontWeight: "bold", padding: "2px 4px", color: "#333" }}>Kelas</td><td style={{ padding: "2px 4px" }}>: {getClassName(student.class_id)}</td></tr>
                        <tr><td style={{ fontWeight: "bold", padding: "2px 4px", color: "#333" }}>Ruangan</td><td style={{ padding: "2px 4px" }}>: {getRoomName(student.user_id)}</td></tr>
                        <tr><td style={{ fontWeight: "bold", padding: "2px 4px", color: "#333" }}>No. Ujian</td><td style={{ padding: "2px 4px" }}>: {examNumbers[student.user_id] ?? String(startNumber + index).padStart(2, "0")}</td></tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: "8px", textAlign: "right", fontSize: "10px" }}>
                      {examDate && <div>{city}, {new Date(examDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>}
                      <div>Kepala Madrasah,</div>
                      <div style={{ height: "50px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                        {signatureUrl && <img src={signatureUrl} alt="TTD" style={{ maxHeight: "45px", maxWidth: "100px" }} />}
                      </div>
                      {principalName && <div style={{ fontWeight: "bold", textDecoration: "underline" }}>{principalName}</div>}
                      {principalNip && <div>NIP. {principalNip}</div>}
                    </div>
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
