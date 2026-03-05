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
          <p>Terakhir diperbarui: {new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>

          <h2 className="text-lg font-semibold text-foreground">1. Informasi yang Kami Kumpulkan</h2>
          <p>
            {settings.school_name} melalui platform ExON mengumpulkan informasi berikut saat Anda menggunakan layanan kami:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nama lengkap dan data identitas siswa (NISN, nomor ujian)</li>
            <li>Data kelas dan ruangan ujian</li>
            <li>Jawaban ujian dan hasil penilaian</li>
            <li>Log aktivitas selama ujian (termasuk catatan pelanggaran)</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">2. Penggunaan Informasi</h2>
          <p>Informasi yang dikumpulkan digunakan untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Menyelenggarakan dan mengelola ujian daring</li>
            <li>Menilai dan melaporkan hasil ujian</li>
            <li>Memantau integritas ujian</li>
            <li>Meningkatkan kualitas layanan</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Perlindungan Data</h2>
          <p>
            Kami menerapkan langkah-langkah keamanan teknis dan organisasional untuk melindungi data pribadi Anda dari akses
            yang tidak sah, pengubahan, pengungkapan, atau penghancuran.
          </p>

          <h2 className="text-lg font-semibold text-foreground">4. Hak Pengguna</h2>
          <p>Anda berhak untuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mengakses data pribadi Anda yang tersimpan</li>
            <li>Meminta koreksi data yang tidak akurat</li>
            <li>Meminta penghapusan data (sesuai ketentuan yang berlaku)</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Kontak</h2>
          <p>
            Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini, silakan hubungi pihak {settings.school_name}.
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default PrivacyPolicy;
