import AppFooter from "@/components/AppFooter";
import { useAppSettings } from "@/hooks/useAppSettings";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  const { settings } = useAppSettings();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <h1 className="text-2xl font-bold mb-6">Kebijakan Privasi</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
          <p>Terakhir diperbarui: 10 Maret 2026</p>

          <h2 className="text-lg font-semibold text-foreground">1. Pendahuluan</h2>
          <p>
            Kebijakan privasi ini menjelaskan bagaimana {settings.school_name} mengelola dan melindungi
            data pribadi pengguna platform ujian daring <strong>ExON (Exam Online)</strong>. Kebijakan ini berlaku bagi
            seluruh pengguna, termasuk tenaga pendidik (guru/admin) dan peserta didik (siswa/siswi).
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Data yang Dikumpulkan</h2>
          <p>Dalam rangka penyelenggaraan ujian daring, platform ini mengumpulkan data berikut:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Data Identitas Siswa:</strong> Nama lengkap, NISN, nomor ujian, kelas, tempat dan tanggal lahir</li>
            <li><strong>Data Identitas Guru:</strong> Nama lengkap, NIP, NUPTK, mata pelajaran, nomor WhatsApp</li>
            <li><strong>Data Akademik:</strong> Jawaban ujian, skor penilaian, waktu pengerjaan, dan riwayat sesi ujian</li>
            <li><strong>Data Keamanan Ujian:</strong> Log pelanggaran anti-cheat (pindah tab, minimize jendela), jumlah pelanggaran, dan waktu kejadian</li>
            <li><strong>Data Penugasan:</strong> Kelas, ruang ujian, dan jadwal ujian yang diikuti</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Tujuan Penggunaan Data</h2>
          <p>Data yang dikumpulkan digunakan secara terbatas untuk keperluan:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Menyelenggarakan dan mengelola ujian daring secara tertib</li>
            <li>Melakukan penilaian, penskoran, dan pelaporan hasil ujian</li>
            <li>Memantau integritas ujian melalui sistem anti-cheat</li>
            <li>Menyusun rekap nilai per kelas, per mata pelajaran, dan per tahun ajaran</li>
            <li>Mengelola data siswa dan penugasan ruang ujian</li>
            <li>Meningkatkan kualitas layanan dan fitur platform</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">4. Perlindungan & Keamanan Data</h2>
          <p>Kami berkomitmen melindungi data pengguna melalui langkah-langkah berikut:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sistem autentikasi yang aman dengan verifikasi email</li>
            <li>Row Level Security (RLS) pada seluruh tabel database untuk mencegah akses tidak sah</li>
            <li>Pemisahan hak akses antara admin (guru) dan siswa</li>
            <li>Kunci jawaban soal tidak dapat diakses oleh siswa melalui mekanisme view database</li>
            <li>Data disimpan pada infrastruktur cloud yang terenkripsi</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Hak Pengguna</h2>
          <p>Setiap pengguna memiliki hak untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mengetahui data pribadi apa saja yang disimpan dalam platform</li>
            <li>Meminta koreksi apabila terdapat data yang tidak akurat</li>
            <li>Meminta penghapusan data melalui pihak administrasi madrasah</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">6. Pembagian Data</h2>
          <p>
            Data pribadi pengguna <strong>tidak akan dibagikan</strong> kepada pihak ketiga di luar lingkungan
            {" "}{settings.school_name}, kecuali diwajibkan oleh peraturan perundang-undangan yang berlaku
            atau atas permintaan resmi dari instansi yang berwenang.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Kontak</h2>
          <p>
            Untuk pertanyaan atau permintaan terkait kebijakan privasi ini, silakan menghubungi
            pihak administrasi {settings.school_name} melalui saluran komunikasi resmi madrasah.
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default PrivacyPolicy;
