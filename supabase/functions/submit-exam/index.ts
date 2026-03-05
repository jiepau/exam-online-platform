import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { exam_id, answers, flagged_indices } = await req.json();

    if (!exam_id || !answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch questions with correct answers, type, and weight
    const { data: questions, error: qError } = await adminClient
      .from("questions")
      .select("id, correct_answer, correct_answer_data, question_type, sort_order, point_weight")
      .eq("exam_id", exam_id)
      .order("sort_order");

    if (qError || !questions) {
      return new Response(JSON.stringify({ error: "Failed to fetch questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate score server-side with type-aware weighted grading
    const total = questions.length;
    let correctCount = 0;
    let totalScore = 0;
    let maxScore = 0;

    questions.forEach((q, _i) => {
      const studentAnswer = answers[String(_i)];
      const studentAnswer = answers[String(i)];
      const type = q.question_type || "multiple_choice";
      const weight = q.point_weight || 1;
      maxScore += weight;
      let isCorrect = false;

      if (type === "multiple_choice" || type === "true_false") {
        if (studentAnswer === q.correct_answer) isCorrect = true;
      } else if (type === "multiple_select") {
        // Partial scoring: proportion of correct selections
        const correctIndices: number[] = Array.isArray(q.correct_answer_data) ? q.correct_answer_data : [];
        const studentIndices: number[] = Array.isArray(studentAnswer) ? studentAnswer : [];
        if (studentIndices.length > 0 && correctIndices.length > 0) {
          const correctHits = studentIndices.filter((idx: number) => correctIndices.includes(idx)).length;
          const wrongHits = studentIndices.filter((idx: number) => !correctIndices.includes(idx)).length;
          const partialRatio = Math.max(0, (correctHits - wrongHits) / correctIndices.length);
          totalScore += weight * partialRatio;
          if (partialRatio === 1) { isCorrect = true; correctCount++; }
          else if (partialRatio > 0) { /* partial, not counted as fully correct */ }
        }
        // skip the final isCorrect block for this type
        return;
      } else if (type === "short_answer") {
        const data = q.correct_answer_data || {};
        const correctAns = (data.answer || "").trim().toLowerCase();
        const aliases: string[] = (data.aliases || []).map((a: string) => a.trim().toLowerCase());
        const allAccepted = [correctAns, ...aliases].filter(Boolean);
        const studentText = (typeof studentAnswer === "string" ? studentAnswer : "").trim().toLowerCase();
        if (studentText && allAccepted.includes(studentText)) {
          isCorrect = true;
        }
      } else if (type === "matching") {
        // Partial scoring: proportion of correct pairs
        const studentOrder: number[] = Array.isArray(studentAnswer) ? studentAnswer : [];
        if (studentOrder.length > 0) {
          const totalPairs = studentOrder.length;
          const correctPairs = studentOrder.filter((v: number, i: number) => v === i).length;
          const partialRatio = correctPairs / totalPairs;
          totalScore += weight * partialRatio;
          if (partialRatio === 1) { isCorrect = true; correctCount++; }
        }
        // skip the final isCorrect block for this type
        return;
      }

      if (isCorrect) {
        correctCount++;
        totalScore += weight;
      }
    });

    const score = totalScore;

    // Save exam session
    const { data: session, error: sessionError } = await adminClient
      .from("exam_sessions")
      .insert({
        student_id: user.id,
        exam_id,
        score,
        correct_answers: correctCount,
        total_questions: total,
        finished_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      return new Response(JSON.stringify({ error: "Failed to save session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save individual answers
    const flaggedSet = new Set(flagged_indices || []);
    const answerRows = questions.map((q, i) => {
      const ans = answers[String(i)];
      const type = q.question_type || "multiple_choice";
      return {
        session_id: session.id,
        question_id: q.id,
        selected_answer: typeof ans === "number" ? ans : null,
        selected_answer_data: (type === "multiple_select" || type === "short_answer" || type === "matching") ? ans : null,
        is_flagged: flaggedSet.has(i),
      };
    });
    await adminClient.from("student_answers").insert(answerRows);

    return new Response(
      JSON.stringify({ success: true, score, correct: correctCount, total, maxScore }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
