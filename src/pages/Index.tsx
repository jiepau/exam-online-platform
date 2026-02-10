import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const Index = () => {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !name.trim()) {
      toast.error("Mohon isi nama dan token ujian");
      return;
    }
    if (token.trim() === "UJIAN2024") {
      navigate("/exam", { state: { studentName: name.trim() } });
    } else {
      toast.error("Token ujian tidak valid. Hubungi guru/pengawas.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="exam-gradient px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ExamKu</h1>
            <p className="text-xs text-white/70">Sistem Ujian Online</p>
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
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl exam-gradient">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Masuk Ujian</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Masukkan nama dan token dari pengawas
              </p>
            </div>

            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Nama Lengkap
                </label>
                <Input
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
              <Button type="submit" className="h-12 w-full text-base font-semibold exam-gradient border-0">
                Mulai Ujian
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Token demo: <span className="font-mono font-bold text-primary">UJIAN2024</span>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
