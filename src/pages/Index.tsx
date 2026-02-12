import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoMadrasah from "@/assets/logo-madrasah.png";

const Index = () => {
  const [token, setToken] = useState("");
  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !nisn.trim() || !password.trim()) {
      toast.error("Mohon isi NISN, password, dan token ujian");
      return;
    }

    setIsLoading(true);

    // Login student with NISN
    const email = `${nisn.trim()}@student.mts43.local`;
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: password.trim(),
    });

    if (loginError) {
      setIsLoading(false);
      toast.error("NISN atau password salah");
      return;
    }

    // Check token in database
    const { data: exam, error } = await supabase
      .from("exams")
      .select("*")
      .eq("token", token.trim())
      .eq("is_active", true)
      .maybeSingle();

    setIsLoading(false);

    if (error || !exam) {
      toast.error("Token ujian tidak valid atau ujian tidak aktif.");
      return;
    }

    // Get student name from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("nisn", nisn.trim())
      .maybeSingle();

    navigate("/exam", {
      state: {
        studentName: profile?.full_name || nisn.trim(),
        examId: exam.id,
        examTitle: exam.title,
        examSubject: exam.subject,
        examDuration: exam.duration,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="exam-gradient px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoMadrasah} alt="Logo MTS Al Wathoniyah 43" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-white">MTS Al Wathoniyah 43</h1>
              <p className="text-xs text-white/70">Sistem Ujian Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {role === "admin" && (
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/admin")}
                    className="text-white hover:bg-white/20 text-sm"
                  >
                    Dashboard Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="text-white hover:bg-white/20 text-sm"
                >
                  Keluar
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-white hover:bg-white/20 text-sm"
              >
                Login Guru
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left - Info */}
          <div>
            <h2 className="text-4xl font-extrabold leading-tight text-foreground">
              Ujian Online
              <br />
              <span className="text-primary">Mudah & Terpercaya</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Sistem ujian berbasis komputer yang aman dan nyaman. Kerjakan ujian
              kapan saja, di mana saja melalui perangkat Anda.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Shield, label: "Aman & Terenkripsi" },
                { icon: Users, label: "Multi Perangkat" },
                { icon: BookOpen, label: "Berbagai Mata Pelajaran" },
                { icon: GraduationCap, label: "Hasil Instan" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm border border-border"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Login Form */}
          <div className="rounded-2xl bg-card p-8 shadow-xl border border-border">
            <div className="mb-6 text-center">
              <img src={logoMadrasah} alt="Logo MTS Al Wathoniyah 43" className="mx-auto mb-3 h-16 w-16 object-contain" />
              <h3 className="text-xl font-bold text-foreground">Masuk Ujian</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Masukkan NISN, password, dan token ujian
              </p>
            </div>

            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  NISN
                </label>
                <Input
                  placeholder="Masukkan NISN"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  className="h-12 font-mono tracking-wider"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Token Ujian
                </label>
                <Input
                  placeholder="Masukkan token ujian"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="h-12 font-mono tracking-widest"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="h-12 w-full text-base font-semibold exam-gradient border-0">
                {isLoading ? "Memeriksa..." : "Mulai Ujian"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
