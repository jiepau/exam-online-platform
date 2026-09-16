import { describe, expect, it } from "vitest";
import { calcFinalScore, KKM } from "@/lib/score";

describe("calcFinalScore — aturan nilai resmi EXON", () => {
  it("TEST 1 — PG only, benar semua", () => {
    expect(calcFinalScore(35, 35, null, false).finalScore).toBe(100);
  });

  it("TEST 2 — PG only, 30/35 → 86", () => {
    expect(calcFinalScore(30, 35, null, false).finalScore).toBe(86);
  });

  it("TEST 3 — bobot berbeda, 36/40 → 90", () => {
    expect(calcFinalScore(36, 40, null, false).finalScore).toBe(90);
  });

  it("TEST 4 — PG + essay, (30+20)/(35+25) → 83", () => {
    const r = calcFinalScore(30, 35, 20, true);
    expect(r.finalScore).toBe(83);
    expect(r.totalMax).toBe(60);
  });

  it("TEST 5 — status kelulusan pada KKM", () => {
    expect(KKM).toBe(75);
    expect(calcFinalScore(75, 100, null, false).passed).toBe(true);
    expect(calcFinalScore(74, 100, null, false).passed).toBe(false);
  });

  it("TEST 7 — ujian tanpa essay tidak ditambah 25", () => {
    expect(calcFinalScore(35, 35, null, false).totalMax).toBe(35);
    expect(calcFinalScore(35, 35, 10, false).finalScore).toBe(100);
  });

  it("TEST 8 — aman dari NaN/Infinity dan batas 0–100", () => {
    const zero = calcFinalScore(10, 0, null, false);
    expect(zero.finalScore).toBe(0);
    expect(Number.isFinite(zero.finalScore)).toBe(true);
    expect(calcFinalScore(null, null, null, false).finalScore).toBe(0);
    expect(calcFinalScore(999, 35, null, false).finalScore).toBe(100);
    expect(calcFinalScore(-5, 35, null, false).finalScore).toBe(0);
    expect(calcFinalScore(30, 35, 999, true).finalScore).toBe(92);
  });

  it("essay belum dinilai ditandai essayPending, dihitung essay = 0", () => {
    const r = calcFinalScore(30, 35, null, true);
    expect(r.essayPending).toBe(true);
    expect(r.finalScore).toBe(50);
  });
});
