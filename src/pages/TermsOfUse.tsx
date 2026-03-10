import AppFooter from "@/components/AppFooter";
import { useAppSettings } from "@/hooks/useAppSettings";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfUse = () => {
  const { settings } = useAppSettings();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 mx-auto max-w-3xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <h1 className="text-2xl font-bold mb-6">Syarat Penggunaan</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
          <p>Terakhir diperbarui: 10 Maret 2026</p>

          <h2 className="text-lg font-semibold text-foreground">1. Ketentuan Umum</h2>
          <p>
            Dengan mengakses dan menggunakan platform ujian daring <strong>ExON (Exam Online)</strong> yang
            dikelola oleh {settings.school_name}, setiap pengguna dianggap telah membaca, memahami, dan
            menyetujui seluruh syarat dan ketentuan yang tercantum dalam dokumen ini.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Jenis Pengguna</h2>
          <p>Platform ini memiliki dua jenis pengguna dengan hak akses berbeda:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Admin (Guru/Tenaga Pendidik):</strong> Memiliki akses untuk mengelola ujian, soal, data siswa, ruang ujian, melihat hasil dan memantau aktivitas ujian secara realtime</li>
            <li><strong>Siswa (Peserta Didik):</strong> Memiliki akses untuk mengerjakan ujian yang telah dijadwalkan oleh admin menggunakan token ujian yang diberikan</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Akun & Keamanan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Akun siswa dibuat oleh admin/guru; siswa tidak dapat mendaftar secara mandiri</li>
            <li>Setiap pengguna bertanggung jawab penuh atas keamanan kredensial akun masing-masing</li>
            <li>Dilarang keras membagikan username, password, atau token ujian kepada pihak lain</li>
            <li>Segera laporkan ke admin jika terjadi akses tidak sah pada akun Anda</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">4. Tata Tertib Ujian</h2>
          <p>Selama ujian berlangsung, peserta didik <strong>wajib</strong> mematuhi ketentuan berikut:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tidak membuka tab, jendela, atau aplikasi lain selama mengerjakan ujian</li>
            <li>Tidak melakukan minimize atau berpindah dari halaman ujian</li>
            <li>Tidak menggunakan alat bantu yang tidak diizinkan (catatan, kalkulator, dsb.) kecuali atas izin guru</li>
            <li>Tidak bekerja sama atau berkomunikasi dengan peserta lain selama ujian</li>
            <li>Menyelesaikan ujian dalam batas waktu yang telah ditentukan</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Sistem Anti-Cheat</h2>
          <p>
            Platform ini dilengkapi dengan sistem deteksi kecurangan otomatis yang akan mencatat setiap
            pelanggaran seperti pindah tab atau minimize jendela. Ketentuan sanksi:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Setiap pelanggaran akan dicatat secara otomatis beserta waktu kejadiannya</li>
            <li>Pelanggaran ke-1 dan ke-2: peringatan di layar</li>
            <li>Pelanggaran ke-3: ujian akan <strong>dihentikan secara otomatis</strong> dan jawaban dikumpulkan</li>
            <li>Seluruh catatan pelanggaran dapat dilihat oleh admin melalui dashboard</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">6. Hak Kekayaan Intelektual</h2>
          <p>
            Seluruh soal ujian, materi, dan konten yang tersedia di platform ini merupakan milik
            {" "}{settings.school_name} dan dilindungi oleh hak kekayaan intelektual. Pengguna dilarang
            menyalin, mendistribusikan, atau mempublikasikan konten ujian tanpa izin tertulis.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Batasan Tanggung Jawab</h2>
          <p>
            Platform disediakan "sebagaimana adanya" (<em>as is</em>). {settings.school_name} tidak bertanggung
            jawab atas gangguan yang berada di luar kendali, termasuk namun tidak terbatas pada:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gangguan koneksi internet pada perangkat pengguna</li>
            <li>Kerusakan atau ketidaksesuaian perangkat yang digunakan</li>
            <li>Kehilangan data akibat kelalaian pengguna (misalnya menutup browser tanpa submit)</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">8. Perubahan Ketentuan</h2>
          <p>
            {settings.school_name} berhak mengubah syarat penggunaan ini sewaktu-waktu tanpa pemberitahuan
            terlebih dahulu. Perubahan akan berlaku efektif segera setelah dipublikasikan di platform ini.
            Pengguna disarankan untuk memeriksa halaman ini secara berkala.
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default TermsOfUse;
