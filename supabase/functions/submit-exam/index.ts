import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // 1. Cek Jadwal Ujian Dulu
    const { data: examData, error: examError } = await adminClient
      .from("exams")
      .select("scheduled_date, start_time, end_time")
      .eq("id", exam_id)
      .single();

    if (examError || !examData) {
      return new Response(JSON.stringify({ error: "Ujian tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logika Waktu (Asia/Jakarta = UTC+7)
    const now = new Date();
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    if (examData.scheduled_date && examData.start_time) {
      // Tafsirkan jadwal sebagai waktu lokal WIB (UTC+7)
      startTime = new Date(`${examData.scheduled_date}T${examData.start_time}+07:00`);
    }
    if (examData.scheduled_date && examData.end_time) {
      endTime = new Date(`${examData.scheduled_date}T${examData.end_time}+07:00`);
    }

    // Validasi Waktu (Jika jadwal diatur)
    if (startTime && now < startTime) {
      return new Response(
        JSON.stringify({ error: `Ujian belum dimulai. Jadwal: ${startTime.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (endTime && now > endTime) {
      return new Response(
        JSON.stringify({ error: `Ujian telah berakhir pada ${endTime.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Ambil Soal untuk Hitung Nilai
    const { data: questions, error: qError } = await adminClient
      .from("questions")
      .select("id, correct_answer, correct_answer_data, question_type, point_weight")
      .eq("exam_id", exam_id);

    if (qError || !questions) {
      return new Response(JSON.stringify({ error: "Gagal mengambil soal" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Hitung Skor
    let totalScore = 0;
    let correctCount = 0;
    const totalQuestions = questions.length;

    questions.forEach((q, index) => {
      // PERBAIKAN: Ambil jawaban siswa dengan benar
      const studentAnswer = answers[String(index)];
      const type = q.question_type || "multiple_choice";
      const weight = q.point_weight || 1;
      let isCorrect = false;

      if (type === "multiple_choice" || type === "true_false") {
        if (String(studentAnswer) === String(q.correct_answer)) isCorrect = true;
      } else if (type === "short_answer") {
        const data = q.correct_answer_data || {};
        const correctAns = (data.answer || "").trim().toLowerCase();
        const studentText = (typeof studentAnswer === "string" ? studentAnswer : "").trim().toLowerCase();
        if (studentText && studentText === correctAns) isCorrect = true;
      }
      // Tambahkan logika tipe lain jika diperlukan

      if (isCorrect) {
        correctCount++;
        totalScore += weight;
      }
    });

    const finalScore = Math.round(totalScore);

    // 4. Simpan/Update Session (Handling Duplicate)
    // Cek apakah sudah ada sesi untuk user ini di ujian ini
    const { data: existingSession } = await adminClient
      .from("exam_sessions")
      .select("id")
      .eq("student_id", user.id)
      .eq("exam_id", exam_id)
      .single();

    let sessionId = existingSession?.id;

    if (existingSession) {
      // Update sesi yang ada
      const { error: updateError } = await adminClient
        .from("exam_sessions")
        .update({
          score: finalScore,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          finished_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) throw new Error("Gagal update sesi");
    } else {
      // Buat sesi baru
      const { data: newSession, error: insertError } = await adminClient
        .from("exam_sessions")
        .insert({
          student_id: user.id,
          exam_id,
          score: finalScore,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          finished_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw new Error("Gagal simpan sesi");
      sessionId = newSession.id;
    }

    // 5. Simpan Jawaban Detail (Hapus lama dulu jika update)
    if (existingSession) {
      await adminClient.from("student_answers").delete().eq("session_id", sessionId);
    }

    const flaggedSet = new Set(flagged_indices || []);
    const answerRows = questions.map((q, i) => {
      const ans = answers[String(i)];
      const type = q.question_type || "multiple_choice";
      return {
        session_id: sessionId,
        question_id: q.id,
        selected_answer: typeof ans === "number" ? ans : null,
        selected_answer_data: ["multiple_select", "short_answer", "matching"].includes(type) ? ans : null,
        is_flagged: flaggedSet.has(i),
      };
    });

    await adminClient.from("student_answers").insert(answerRows);

    return new Response(
      JSON.stringify({ success: true, score: finalScore, correct: correctCount, total: totalQuestions }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Submit Exam Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
