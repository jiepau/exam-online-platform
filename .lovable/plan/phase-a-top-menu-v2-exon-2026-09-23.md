# Phase A — Top Menu V2 EXON

## Tujuan
Menata ulang navigasi Staff agar seluruh menu tetap mudah diakses tanpa scroll horizontal, tanpa mengubah izin, rute, header, maupun alur aplikasi.

## Perubahan
- Tetap menyaring seluruh `navItems` dengan `can(role, item.permission)`.
- Tampilkan menu prioritas langsung: Dashboard, Monitor, Kelola Ujian, Bank Soal, Hasil Siswa, dan Kelola Siswa.
- Masukkan item lain yang lolos izin ke dropdown **Lainnya** memakai komponen dropdown yang sudah tersedia.
- Pada layar lebih kecil, tampilkan lebih sedikit menu langsung dan pindahkan sisanya ke **Lainnya**, tanpa menghilangkan akses.
- Pertahankan garis/status aktif pada menu langsung; tandai **Lainnya** ketika rute aktif berada di dalam dropdown.
- Hapus scroll horizontal dan petunjuk “Geser menu ke samping”.

## Batasan
- Hanya mengubah `src/components/admin/AdminLayout.tsx`.
- Tidak mengubah auth, permission, routing, database, RLS, PWA, header, ujian siswa, penilaian, anti-cheat, Monitor, Status Sync, atau log pelanggaran.

## Verifikasi
- Periksa semua 13 menu Admin tetap tersedia melalui menu langsung atau dropdown.
- Uji navigasi semua item, status aktif menu langsung/dropdown, refresh, dan pindah tab.
- Uji desktop serta viewport lebih kecil untuk memastikan tidak ada overflow horizontal.
- Verifikasi Guru melalui kode jika akun Guru tidak tersedia, tanpa membuat data uji.
