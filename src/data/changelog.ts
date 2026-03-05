export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-01-05",
    title: "Rilis Awal",
    changes: [
      "Sistem autentikasi admin (Guru) dan siswa",
      "Manajemen ujian: buat, edit, hapus ujian",
      "Soal pilihan ganda dengan opsi A-E",
      "Token ujian untuk akses siswa",
      "Timer ujian dengan durasi yang dapat diatur",
      "Halaman pengerjaan ujian untuk siswa",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-01-26",
    title: "Manajemen Siswa & Kelas",
    changes: [
      "Pendaftaran siswa oleh admin (tanpa registrasi mandiri)",
      "Manajemen kelas dengan urutan kustom",
      "Profil siswa: NISN, tempat/tanggal lahir, WhatsApp",
      "Profil guru: NIP, NUPTK, mata pelajaran",
      "Daftar siswa dengan filter per kelas",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-02-16",
    title: "Hasil & Penilaian",
    changes: [
      "Halaman hasil ujian untuk admin",
      "Detail jawaban siswa per soal",
      "Export hasil ke Excel",
      "Rekap rata-rata per kelas dan per mapel",
      "Filter hasil berdasarkan kelas, mapel, dan nama",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-09",
    title: "Anti-Cheat & Keamanan",
    changes: [
      "Sistem anti-cheat: deteksi pindah tab/minimize",
      "Overlay peringatan pelanggaran dengan hitungan 3x",
      "Log pelanggaran realtime di dashboard admin",
      "View database untuk menyembunyikan kunci jawaban dari siswa",
      "Row Level Security (RLS) pada semua tabel",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-03-30",
    title: "Tipe Soal Baru",
    changes: [
      "Soal Benar/Salah (True/False)",
      "Soal PG Kompleks (pilih lebih dari satu jawaban benar)",
      "Soal Menjodohkan (Matching)",
      "Soal Isian Singkat (Short Answer) dengan alias",
      "Import soal dari file Word (.docx)",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-04-20",
    title: "Ruang Ujian & PWA",
    changes: [
      "Manajemen ruang ujian",
      "Penugasan siswa ke ruang ujian",
      "Konfirmasi data siswa sebelum mulai ujian",
      "Progressive Web App (PWA) - install di perangkat",
      "Splash screen saat loading aplikasi",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-05-11",
    title: "Monitoring & Pengaturan",
    changes: [
      "Live monitor ujian (realtime)",
      "Pengaturan aplikasi: nama sekolah, logo, tema warna",
      "Dark mode dan light mode",
      "Cetak kartu ujian siswa",
      "Auto-save jawaban draft saat mengerjakan ujian",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-06-01",
    title: "Riwayat Pelanggaran & Penyempurnaan",
    changes: [
      "Halaman riwayat pelanggaran dengan filter",
      "Gambar pada soal (upload gambar soal)",
      "Render LaTeX/rumus matematika pada soal",
      "Nomor urut ujian otomatis untuk siswa",
      "Navigasi soal dengan penanda (flag) soal ragu",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-06-22",
    title: "Bobot Poin & Peningkatan Penilaian",
    changes: [
      "Bobot poin per soal (point weight) — soal bernilai berbeda",
      "Skor berbobot ditampilkan di detail hasil siswa",
      "Rekap skor didapat vs skor maksimal",
      "Tahun ajaran pada data ujian",
      "Popup What's New untuk admin setelah login",
    ],
  },
];

export const CURRENT_VERSION = changelog[changelog.length - 1].version;
