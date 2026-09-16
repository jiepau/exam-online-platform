/**
 * SATU SUMBER PERHITUNGAN NILAI EXON.
 * Semua area (daftar hasil, detail, cetak, statistik, rekap, Excel)
 * WAJIB memakai fungsi ini agar Nilai Akhir & status konsisten.
 *
 * Tanpa essay : Nilai = (Skor PG / Maks Bobot PG) x 100
 * Dengan essay: Nilai = ((Skor PG + Essay) / (Maks Bobot PG + 25)) x 100
 */

export const ESSAY_MAX = 25;
export const KKM = 75;

export interface FinalScoreResult {
  /** Nilai Akhir 0–100 (dibulatkan) */
  finalScore: number;
  totalRaw: number;
  totalMax: number;
  passed: boolean;
  /** true bila ujian punya essay tetapi belum dinilai guru */
  essayPending: boolean;
}

const safeNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const calcFinalScore = (
  pgScore: number | null | undefined,
  pgMax: number | null | undefined,
  essayScore: number | null | undefined,
  hasEssay: boolean = false,
): FinalScoreResult => {
  const pg = Math.max(0, safeNum(pgScore));
  const maxPg = Math.max(0, safeNum(pgMax));
  const essay = hasEssay ? Math.min(ESSAY_MAX, Math.max(0, safeNum(essayScore))) : 0;
  const essayPending = hasEssay && (essayScore === null || essayScore === undefined);

  const totalRaw = pg + essay;
  const totalMax = maxPg + (hasEssay ? ESSAY_MAX : 0);

  if (totalMax <= 0) {
    return { finalScore: 0, totalRaw, totalMax: 0, passed: false, essayPending };
  }

  const raw = Math.round((totalRaw / totalMax) * 100);
  const finalScore = Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0));
  return { finalScore, totalRaw, totalMax, passed: finalScore >= KKM, essayPending };
};
