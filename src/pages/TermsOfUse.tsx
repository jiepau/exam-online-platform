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
          <p>Terakhir diperbarui: {new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>

          <h2 className="text-lg font-semibold text-foreground">1. Ketentuan Umum</h2>
          <p>
            Dengan menggunakan platform ExON yang dikelola oleh {settings.school_name}, Anda menyetujui untuk mematuhi
            syarat dan ketentuan berikut.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Penggunaan yang Diperbolehkan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Platform ini hanya digunakan untuk keperluan ujian dan evaluasi akademik</li>
            <li>Setiap pengguna bertanggung jawab atas keamanan akun masing-masing</li>
            <li>Dilarang membagikan kredensial akun kepada pihak lain</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Integritas Ujian</h2>
          <p>Selama ujian berlangsung, peserta wajib:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tidak membuka tab atau aplikasi lain</li>
            <li>Tidak menggunakan alat bantu yang tidak diizinkan</li>
            <li>Tidak bekerja sama dengan peserta lain</li>
            <li>Mematuhi batas waktu yang telah ditentukan</li>
          </ul>
          <p>
            Pelanggaran terhadap ketentuan di atas akan dicatat secara otomatis oleh sistem dan dapat berakibat pada
            pembatalan hasil ujian.
          </p>

          <h2 className="text-lg font-semibold text-foreground">4. Batasan Tanggung Jawab</h2>
          <p>
            Platform disediakan "sebagaimana adanya". Kami tidak bertanggung jawab atas gangguan teknis yang berada di luar
            kendali kami, termasuk namun tidak terbatas pada masalah koneksi internet pengguna.
          </p>

          <h2 className="text-lg font-semibold text-foreground">5. Perubahan Ketentuan</h2>
          <p>
            Kami berhak mengubah syarat penggunaan ini sewaktu-waktu. Perubahan akan berlaku segera setelah dipublikasikan
            di platform ini.
          </p>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default TermsOfUse;
