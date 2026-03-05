import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutoSaveState {
  answers: Record<number, number | number[] | string>;
  flagged: Set<number>;
  currentIndex: number;
}

interface SavedDraft {
  answers: Record<number, number | number[] | string>;
  flagged: number[];
  currentIndex: number;
}

/**
 * Auto-saves exam answers to the database every few seconds,
 * and restores them on page load (supports device switching).
 */
export const useExamAutoSave = (examId: string | undefined, active: boolean) => {
  const stateRef = useRef<AutoSaveState>({ answers: {}, flagged: new Set(), currentIndex: 0 });
  const lastSavedJson = useRef<string>("");
  const savingRef = useRef(false);

  // Update ref without triggering re-renders
  const updateState = useCallback((state: AutoSaveState) => {
    stateRef.current = state;
  }, []);

  // Save to database
  const saveNow = useCallback(async () => {
    if (!examId || savingRef.current) return;

    const { answers, flagged, currentIndex } = stateRef.current;
    const payload = {
      answers,
      flagged_indices: Array.from(flagged),
      current_index: currentIndex,
    };
    const json = JSON.stringify(payload);

    // Skip if nothing changed
    if (json === lastSavedJson.current) return;

    savingRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("draft_answers" as any)
        .upsert(
          {
            student_id: user.id,
            exam_id: examId,
            answers: payload.answers,
            flagged_indices: payload.flagged_indices,
            current_index: payload.current_index,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "student_id,exam_id" }
        );

      if (!error) {
        lastSavedJson.current = json;
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
    } finally {
      savingRef.current = false;
    }
  }, [examId]);

  // Periodic auto-save every 10 seconds
  useEffect(() => {
    if (!active || !examId) return;
    const interval = setInterval(saveNow, 10000);
    return () => clearInterval(interval);
  }, [active, examId, saveNow]);

  // Save on visibility change (user switching tabs/apps)
  useEffect(() => {
    if (!active) return;
    const handleVisibility = () => {
      if (document.hidden) saveNow();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, saveNow]);

  // Save before unload
  useEffect(() => {
    if (!active) return;
    const handleBeforeUnload = () => saveNow();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active, saveNow]);

  // Load saved draft
  const loadDraft = useCallback(async (): Promise<SavedDraft | null> => {
    if (!examId) return null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("draft_answers" as any)
        .select("answers, flagged_indices, current_index")
        .eq("student_id", user.id)
        .eq("exam_id", examId)
        .maybeSingle();

      if (error || !data) return null;

      const d = data as any;
      return {
        answers: d.answers || {},
        flagged: d.flagged_indices || [],
        currentIndex: d.current_index || 0,
      };
    } catch {
      return null;
    }
  }, [examId]);

  // Delete draft after successful submission
  const clearDraft = useCallback(async () => {
    if (!examId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("draft_answers" as any)
        .delete()
        .eq("student_id", user.id)
        .eq("exam_id", examId);
    } catch {
      // ignore
    }
  }, [examId]);

  return { updateState, saveNow, loadDraft, clearDraft };
};
