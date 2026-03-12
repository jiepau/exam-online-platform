import { useEffect, useRef, useCallback, useState } from "react";
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

const LOCAL_KEY = (examId: string) => `exam_draft_${examId}`;
const QUESTIONS_KEY = (examId: string) => `exam_questions_${examId}`;
const PENDING_SUBMIT_KEY = (examId: string) => `exam_pending_submit_${examId}`;

/** Save draft to localStorage instantly */
const saveLocal = (examId: string, state: AutoSaveState) => {
  try {
    const payload = {
      answers: state.answers,
      flagged_indices: Array.from(state.flagged),
      current_index: state.currentIndex,
      saved_at: Date.now(),
    };
    localStorage.setItem(LOCAL_KEY(examId), JSON.stringify(payload));
  } catch {
    // storage full or unavailable
  }
};

/** Load draft from localStorage */
const loadLocal = (examId: string): SavedDraft | null => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(examId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      answers: d.answers || {},
      flagged: d.flagged_indices || [],
      currentIndex: d.current_index || 0,
    };
  } catch {
    return null;
  }
};

/** Cache questions to localStorage */
export const cacheQuestions = (examId: string, questions: any[]) => {
  try {
    localStorage.setItem(QUESTIONS_KEY(examId), JSON.stringify(questions));
  } catch {
    // ignore
  }
};

/** Load cached questions from localStorage */
export const loadCachedQuestions = (examId: string): any[] | null => {
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Save pending submission for later sync */
export const savePendingSubmit = (examId: string, payload: any) => {
  try {
    localStorage.setItem(PENDING_SUBMIT_KEY(examId), JSON.stringify(payload));
  } catch {
    // ignore
  }
};

/** Check and retry pending submissions */
export const getPendingSubmit = (examId: string) => {
  try {
    const raw = localStorage.getItem(PENDING_SUBMIT_KEY(examId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingSubmit = (examId: string) => {
  try {
    localStorage.removeItem(PENDING_SUBMIT_KEY(examId));
  } catch {
    // ignore
  }
};

/**
 * Offline-first auto-save: saves to localStorage instantly,
 * syncs to server in background. Works fully offline.
 */
export const useExamAutoSave = (examId: string | undefined, active: boolean) => {
  const stateRef = useRef<AutoSaveState>({ answers: {}, flagged: new Set(), currentIndex: 0 });
  const lastSyncedJson = useRef<string>("");
  const savingRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline" | "error">("synced");

  const updateState = useCallback((state: AutoSaveState) => {
    stateRef.current = state;
    // Save to localStorage immediately (instant, no network)
    if (examId) saveLocal(examId, state);
  }, [examId]);

  // Sync to server (background)
  const syncToServer = useCallback(async () => {
    if (!examId || savingRef.current) return;

    const { answers, flagged, currentIndex } = stateRef.current;
    const payload = {
      answers,
      flagged_indices: Array.from(flagged),
      current_index: currentIndex,
    };
    const json = JSON.stringify(payload);
    if (json === lastSyncedJson.current) return;

    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    savingRef.current = true;
    setSyncStatus("saving");
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
        lastSyncedJson.current = json;
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus(navigator.onLine ? "error" : "offline");
    } finally {
      savingRef.current = false;
    }
  }, [examId]);

  // Keep saveNow as alias for compatibility
  const saveNow = syncToServer;

  // Periodic sync every 10 seconds
  useEffect(() => {
    if (!active || !examId) return;
    const interval = setInterval(syncToServer, 10000);
    return () => clearInterval(interval);
  }, [active, examId, syncToServer]);

  // Sync on visibility change
  useEffect(() => {
    if (!active) return;
    const handleVisibility = () => {
      if (document.hidden) syncToServer();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, syncToServer]);

  // Sync before unload
  useEffect(() => {
    if (!active) return;
    const handleBeforeUnload = () => syncToServer();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active, syncToServer]);

  // Listen for online/offline events to update status & retry
  useEffect(() => {
    if (!active) return;
    const goOnline = () => {
      syncToServer();
    };
    const goOffline = () => {
      setSyncStatus("offline");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [active, syncToServer]);

  // Load draft: try localStorage first (instant), then server
  const loadDraft = useCallback(async (): Promise<SavedDraft | null> => {
    if (!examId) return null;

    // 1. Local draft (instant)
    const localDraft = loadLocal(examId);

    // 2. Try server draft
    if (navigator.onLine) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("draft_answers" as any)
            .select("answers, flagged_indices, current_index, updated_at")
            .eq("student_id", user.id)
            .eq("exam_id", examId)
            .maybeSingle();

          if (data) {
            const serverDraft: SavedDraft = {
              answers: (data as any).answers || {},
              flagged: (data as any).flagged_indices || [],
              currentIndex: (data as any).current_index || 0,
            };

            // Compare: use whichever has more answers
            const localCount = localDraft ? Object.keys(localDraft.answers).length : 0;
            const serverCount = Object.keys(serverDraft.answers).length;

            if (serverCount >= localCount) {
              return serverDraft;
            }
          }
        }
      } catch {
        // Offline or error — fall through to local
      }
    }

    return localDraft;
  }, [examId]);

  // Clear draft from both local and server
  const clearDraft = useCallback(async () => {
    if (!examId) return;
    try {
      localStorage.removeItem(LOCAL_KEY(examId));
      localStorage.removeItem(QUESTIONS_KEY(examId));
    } catch {
      // ignore
    }
    if (navigator.onLine) {
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
    }
  }, [examId]);

  return { updateState, saveNow, loadDraft, clearDraft, syncStatus };
};
