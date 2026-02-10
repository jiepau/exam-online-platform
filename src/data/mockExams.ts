export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  image?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  questions: Question[];
}

export const mockExam: Exam = {
  id: "exam-001",
  title: "Ujian Asesmen Literasi",
  subject: "Literasi Membaca",
  duration: 60,
  questions: [
    {
      id: 1,
      text: "Bacalah paragraf berikut:\n\n\"Perubahan iklim global telah menyebabkan berbagai dampak serius terhadap kehidupan di bumi. Suhu rata-rata permukaan bumi meningkat sekitar 1,1°C sejak era pra-industri. Kenaikan ini mengakibatkan pencairan es di kutub, kenaikan permukaan air laut, dan perubahan pola cuaca yang ekstrem.\"\n\nApa ide pokok dari paragraf tersebut?",
      options: [
        "Suhu bumi meningkat 1,1°C sejak era pra-industri",
        "Perubahan iklim global menyebabkan dampak serius bagi kehidupan di bumi",
        "Es di kutub mencair akibat pemanasan global",
        "Pola cuaca menjadi ekstrem di seluruh dunia"
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      text: "Sebuah penelitian menunjukkan bahwa siswa yang membaca minimal 30 menit setiap hari memiliki kemampuan literasi 40% lebih tinggi dibandingkan yang tidak. Apa kesimpulan yang paling tepat dari data tersebut?",
      options: [
        "Semua siswa harus membaca buku pelajaran setiap hari",
        "Kebiasaan membaca rutin berkorelasi positif dengan kemampuan literasi",
        "Siswa yang tidak membaca pasti memiliki literasi rendah",
        "Membaca 30 menit sudah cukup untuk menjadi pintar"
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      text: "Perhatikan data berikut:\n\n- Tahun 2020: Produksi sampah plastik 300 juta ton\n- Tahun 2021: Produksi sampah plastik 320 juta ton\n- Tahun 2022: Produksi sampah plastik 350 juta ton\n\nBerdasarkan tren data tersebut, pernyataan yang paling tepat adalah...",
      options: [
        "Produksi sampah plastik menurun setiap tahun",
        "Produksi sampah plastik tetap stabil",
        "Produksi sampah plastik meningkat setiap tahun",
        "Data tidak cukup untuk membuat kesimpulan"
      ],
      correctAnswer: 2,
    },
    {
      id: 4,
      text: "\"Pendidikan karakter tidak hanya diajarkan melalui mata pelajaran di kelas, tetapi juga melalui keteladanan guru, budaya sekolah, dan kegiatan ekstrakurikuler.\"\n\nMakna implisit dari kalimat tersebut adalah...",
      options: [
        "Pendidikan karakter hanya bisa diajarkan di kelas",
        "Guru adalah satu-satunya yang bertanggung jawab atas pendidikan karakter",
        "Pendidikan karakter bersifat holistik dan terintegrasi dalam berbagai aspek sekolah",
        "Kegiatan ekstrakurikuler lebih penting dari pelajaran di kelas"
      ],
      correctAnswer: 2,
    },
    {
      id: 5,
      text: "Dalam sebuah teks prosedur tentang cara membuat kompos, langkah pertama yang harus dilakukan adalah...",
      options: [
        "Menyiram kompos dengan air",
        "Menyiapkan bahan organik seperti daun kering dan sisa makanan",
        "Membalik tumpukan kompos",
        "Menggunakan kompos untuk tanaman"
      ],
      correctAnswer: 1,
    },
    {
      id: 6,
      text: "Grafik menunjukkan bahwa tingkat literasi digital di Indonesia meningkat dari 50% pada 2019 menjadi 62% pada 2023. Namun, kesenjangan antara daerah perkotaan dan pedesaan masih signifikan.\n\nInformasi apa yang TIDAK dapat disimpulkan dari data tersebut?",
      options: [
        "Literasi digital di Indonesia mengalami peningkatan",
        "Masih ada kesenjangan literasi digital antar wilayah",
        "Program pemerintah berhasil meningkatkan literasi digital",
        "Tren peningkatan literasi digital positif dalam 4 tahun terakhir"
      ],
      correctAnswer: 2,
    },
    {
      id: 7,
      text: "Kata 'efektif' dalam kalimat \"Metode pembelajaran berbasis proyek terbukti efektif meningkatkan kreativitas siswa\" memiliki makna...",
      options: [
        "Cepat dan mudah dilakukan",
        "Berhasil guna dan memberikan hasil yang diharapkan",
        "Populer di kalangan guru",
        "Mahal tetapi berkualitas"
      ],
      correctAnswer: 1,
    },
    {
      id: 8,
      text: "Sebuah editorial surat kabar menyatakan: \"Pembangunan infrastruktur di daerah terpencil harus menjadi prioritas utama pemerintah.\"\n\nJenis kalimat tersebut adalah...",
      options: [
        "Kalimat fakta",
        "Kalimat persuasif/opini",
        "Kalimat deskriptif",
        "Kalimat naratif"
      ],
      correctAnswer: 1,
    },
    {
      id: 9,
      text: "Dalam konteks teks eksposisi, fungsi dari paragraf penutup adalah...",
      options: [
        "Memperkenalkan topik baru",
        "Menyajikan data pendukung tambahan",
        "Menegaskan kembali pendapat penulis dan memberikan kesimpulan",
        "Memberikan contoh kasus tambahan"
      ],
      correctAnswer: 2,
    },
    {
      id: 10,
      text: "Perhatikan kalimat berikut:\n\"Meskipun cuaca buruk, para relawan tetap mendistribusikan bantuan kepada korban banjir.\"\n\nHubungan antar klausa dalam kalimat tersebut adalah...",
      options: [
        "Hubungan sebab-akibat",
        "Hubungan pertentangan (konsesif)",
        "Hubungan waktu",
        "Hubungan perbandingan"
      ],
      correctAnswer: 1,
    },
  ],
};
