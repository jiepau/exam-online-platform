import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { students } = await req.json();
    // students: Array of { nisn, full_name, password }

    if (!Array.isArray(students) || students.length === 0) {
      return new Response(JSON.stringify({ error: "No students provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const results: { nisn: string; success: boolean; error?: string }[] = [];

    for (const s of students) {
      const { nisn, full_name, password } = s;
      if (!nisn || !full_name || !password) {
        results.push({ nisn: nisn || "?", success: false, error: "Data tidak lengkap" });
        continue;
      }

      // Use nisn as fake email for auth
      const email = `${nisn}@student.mts43.local`;

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, nisn },
      });

      if (createError) {
        results.push({ nisn, success: false, error: createError.message });
        continue;
      }

      // Assign student role
      await adminClient.from("user_roles").insert({ user_id: newUser.user!.id, role: "student" });

      // Update profile with NISN
      await adminClient.from("profiles").update({ nisn }).eq("user_id", newUser.user!.id);

      results.push({ nisn, success: true });
    }

    const successCount = results.filter((r) => r.success).length;
    return new Response(
      JSON.stringify({ success: true, total: students.length, registered: successCount, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
