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

    // 1. Ambil data ujian & jadwal
    const { data: examData, error: examError } = await adminClient
      .from("exams")
      .select("id, start_time, end_time, scheduled_date, total_questions")
      .eq("id", exam_id)
      .single();

    if (examError || !examData) {
      console.error("Gagal ambil data ujian:", examError);
      return new Response(JSON.stringify({ error: "Ujian tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Logika Pengecekan Waktu (Diperbaiki)
    const now = new Date();

    // Gabungkan tanggal dan waktu menjadi satu objek Date yang valid
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    if (examData.scheduled_date && examData.start_time) {
      // Format: YYYY-MM-DDTHH:mm:ss
      const startStr = `${examData.scheduled_date}T${examData.start_time}`;
      startTime = new Date(startStr);
    }

    if (examData.scheduled_date && examData.end_time) {
      const endStr = `${examData.scheduled_date}T${examData.end_time}`;
      endTime = new Date(endStr);
    }

    // Validasi Waktu
    if (startTime && now < startTime) {
      return new Response(JSON.stringify({ error: "Ujian belum dimulai." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (endTime && now > endTime) {
      return new Response(JSON.stringify({ error: "Ujian telah berakhir." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Ambil Soal untuk Koreksi
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

    // 4. Hitung Nilai
    let totalScore = 0;
    let correctCount = 0;
    const totalQuestions = questions.length;

    questions.forEach((q, index) => {
      // PERBAIKAN: Ambil jawaban siswa dengan benar tanpa duplikasi variabel
      const studentAnswer = answers[String(index)];
      const type = q.question_type || "multiple_choice";
      const weight = q.point_weight || 1;
      let isCorrect = false;

      if (type === "multiple_choice" || type === "true_false") {
        if (studentAnswer === q.correct_answer) isCorrect = true;
      } else if (type === "multiple_select") {
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
        return; // Lanjut ke soal berikutnya
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
        const studentOrder: number[] = Array.isArray(studentAnswer) ? studentAnswer : [];
        if (studentOrder.length > 0) {
          const correctPairs = studentOrder.filter((v: number, i: number) => v === i).length;
          const partialRatio = correctPairs / studentOrder.length;
          totalScore += weight * partialRatio;
          if (partialRatio === 1) {
            isCorrect = true;
            correctCount++;
          }
        }
        return;
      }

      if (isCorrect) {
        correctCount++;
        totalScore += weight;
      }
    });

    const finalScore = Math.round(totalScore);

    // 5. Simpan/Update Session (Menangani Submit Ulang)
    // Cek apakah sudah ada sesi untuk siswa ini di ujian ini
    const { data: existingSession } = await adminClient
      .from("exam_sessions")
      .select("id")
      .eq("student_id", user.id)
      .eq("exam_id", exam_id)
      .single();

    let sessionId: string;

    if (existingSession) {
      // UPDATE sesi yang sudah ada
      const { data: updatedSession, error: updateError } = await adminClient
        .from("exam_sessions")
        .update({
          score: finalScore,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          finished_at: new Date().toISOString(),
          // Kita tidak update started_at agar tetap waktu awal pertama kali
        })
        .eq("id", existingSession.id)
        .select()
        .single();

      if (updateError) throw updateError;
      sessionId = updatedSession.id;

      // Hapus jawaban lama agar tidak duplikat
      await adminClient.from("student_answers").delete().eq("session_id", sessionId);
    } else {
      // INSERT sesi baru
      const { data: newSession, error: insertError } = await adminClient
        .from("exam_sessions")
        .insert({
          student_id: user.id,
          exam_id,
          score: finalScore,
          correct_answers: correctCount,
          total_questions: totalQuestions,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      sessionId = newSession.id;
    }

    // 6. Simpan Jawaban Detail
    const flaggedSet = new Set(flagged_indices || []);
    const answerRows = questions.map((q, i) => {
      const ans = answers[String(i)];
      const type = q.question_type || "multiple_choice";
      return {
        session_id: sessionId,
        question_id: q.id,
        selected_answer: typeof ans === "number" ? ans : null,
        selected_answer_data: type === "multiple_select" || type === "short_answer" || type === "matching" ? ans : null,
        is_flagged: flaggedSet.has(i),
      };
    });

    await adminClient.from("student_answers").insert(answerRows);

    return new Response(
      JSON.stringify({
        success: true,
        score: finalScore,
        correct: correctCount,
        total: totalQuestions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Error submitting exam:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
