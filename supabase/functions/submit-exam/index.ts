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

    // Verify the student
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

    // Use service role to read correct answers (not exposed to client)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch questions with correct_answer server-side
    const { data: questions, error: qError } = await adminClient
      .from("questions")
      .select("id, correct_answer, sort_order")
      .eq("exam_id", exam_id)
      .order("sort_order");

    if (qError || !questions) {
      return new Response(JSON.stringify({ error: "Failed to fetch questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate score server-side
    const total = questions.length;
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[String(i)] === q.correct_answer) correct++;
    });
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Save exam session
    const { data: session, error: sessionError } = await adminClient
      .from("exam_sessions")
      .insert({
        student_id: user.id,
        exam_id,
        score,
        correct_answers: correct,
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
    const answerRows = questions.map((q, i) => ({
      session_id: session.id,
      question_id: q.id,
      selected_answer: answers[String(i)] ?? null,
      is_flagged: flaggedSet.has(i),
    }));
    await adminClient.from("student_answers").insert(answerRows);

    return new Response(
      JSON.stringify({ success: true, score, correct, total }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
