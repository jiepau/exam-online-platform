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
    const {
      data: { user },
    } = await userClient.auth.getUser();
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

    // 1. Ambil data ujian termasuk jadwalnya (Pengecekan Waktu)
    const { data: examData, error: examError } = await adminClient
      .from("exams")
      .select("id, start_time, end_time, scheduled_date")
      .eq("id", exam_id)
      .single();

    if (examError || !examData) {
      return new Response(JSON.stringify({ error: "Ujian tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logika Pengecekan Waktu
    const now = new Date();
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    if (examData.scheduled_date && examData.start_time) {
      // Gabungkan tanggal dan waktu mulai
      const datePart = examData.scheduled_date.split("T")[0];
      startTime = new Date(`${datePart}T${examData.start_time}`);
    }

    if (examData.scheduled_date && examData.end_time) {
      // Gabungkan tanggal dan waktu selesai
      const datePart = examData.scheduled_date.split("T")[0];
      endTime = new Date(`${datePart}T${examData.end_time}`);
    }

    // Cek apakah waktu sekarang berada di luar jadwal
    if (startTime && now < startTime) {
      return new Response(
        JSON.stringify({ error: "Ujian belum dimulai. Silakan tunggu hingga waktu yang ditentukan." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (endTime && now > endTime) {
      return new Response(JSON.stringify({ error: "Ujian telah berakhir. Anda tidak dapat mengirim jawaban lagi." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    questions.forEach((q, i) => {
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
          if (partialRatio === 1) {
            isCorrect = true;
            correctCount++;
          }
        }
        return; // Skip final isCorrect block
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
          if (partialRatio === 1) {
            isCorrect = true;
            correctCount++;
          }
        }
        return; // Skip final isCorrect block
      }

      if (isCorrect) {
        correctCount++;
        totalScore += weight;
      }
    });

    const score = Math.round(totalScore);

    // Save exam session (Update if exists, Insert if new)
    const { data: existingSession } = await adminClient
      .from("exam_sessions")
      .select("id")
      .eq("student_id", user.id)
      .eq("exam_id", exam_id)
      .single();

    let session;
    if (existingSession) {
      const { data: updatedSession, error: updateError } = await adminClient
        .from("exam_sessions")
        .update({
          score,
          correct_answers: correctCount,
          total_questions: total,
          finished_at: new Date().toISOString(),
        })
        .eq("id", existingSession.id)
        .select()
        .single();

      if (updateError) throw updateError;
      session = updatedSession;
    } else {
      const { data: newSession, error: insertError } = await adminClient
        .from("exam_sessions")
        .insert({
          student_id: user.id,
          exam_id,
          score,
          correct_answers: correctCount,
          total_questions: total,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      session = newSession;
    }

    // Save individual answers (Hanya simpan jika session baru, atau hapus dulu yang lama jika ingin update)
    // Untuk simplifikasi, kita hapus jawaban lama jika update, lalu insert baru
    if (existingSession) {
      await adminClient.from("student_answers").delete().eq("session_id", existingSession.id);
    }

    const flaggedSet = new Set(flagged_indices || []);
    const answerRows = questions.map((q, i) => {
      const ans = answers[String(i)];
      const type = q.question_type || "multiple_choice";
      return {
        session_id: session.id,
        question_id: q.id,
        selected_answer: typeof ans === "number" ? ans : null,
        selected_answer_data: type === "multiple_select" || type === "short_answer" || type === "matching" ? ans : null,
        is_flagged: flaggedSet.has(i),
      };
    });

    await adminClient.from("student_answers").insert(answerRows);

    return new Response(JSON.stringify({ success: true, score, correct: correctCount, total, maxScore }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Submit exam error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
