import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Forbidden" }, 403);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const action = body?.action;

    if (action === "create") {
      const { email, password, full_name, nip, nuptk, subject } = body;
      if (!email || !password || !full_name) {
        return json({ error: "Nama, email, dan password wajib diisi" }, 400);
      }
      if (String(password).length < 8) {
        return json({ error: "Password minimal 8 karakter" }, 400);
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) return json({ error: createError.message }, 400);

      const userId = newUser.user!.id;
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: userId, role: "teacher" });
      if (roleError) {
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: roleError.message }, 400);
      }

      const updateData: Record<string, unknown> = { full_name };
      if (nip) updateData.nip = nip;
      if (nuptk) updateData.nuptk = nuptk;
      if (subject) updateData.subject = subject;
      await adminClient.from("profiles").update(updateData).eq("user_id", userId);

      return json({ success: true, user_id: userId });
    }

    if (action === "delete") {
      const userId = body?.user_id;
      if (!userId) return json({ error: "user_id wajib diisi" }, 400);
      if (userId === caller.id) return json({ error: "Tidak dapat menghapus akun sendiri" }, 400);

      const { data: targetRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (targetRole?.role !== "teacher") {
        return json({ error: "Akun ini bukan akun guru" }, 400);
      }

      const { error: delError } = await adminClient.auth.admin.deleteUser(userId);
      if (delError) return json({ error: delError.message }, 400);

      return json({ success: true });
    }

    return json({ error: "Aksi tidak dikenal" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
