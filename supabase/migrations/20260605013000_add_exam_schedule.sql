-- Tambahkan kolom penjadwalan ke tabel exams
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Beri komentar pada kolom baru
COMMENT ON COLUMN public.exams.scheduled_date IS 'Tanggal pelaksanaan ujian';
COMMENT ON COLUMN public.exams.start_time IS 'Jam mulai ujian';
COMMENT ON COLUMN public.exams.end_time IS 'Jam selesai ujian';
COMMENT ON COLUMN public.exams.is_active IS 'Status aktif ujian (manual override)';

-- Buat index untuk performa pencarian berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_exams_schedule ON public.exams(scheduled_date, start_time, end_time);
