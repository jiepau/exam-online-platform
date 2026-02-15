import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, role, signIn } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect after login
  useEffect(() => {
    if (user && role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user && role === "student") {
      navigate("/", { replace: true });
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Mohon isi email dan password");
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Berhasil masuk!");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl exam-gradient">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MTS Al Wathoniyah 43</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal Guru</p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-xl border border-border">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <LogIn className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Masuk</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="email@contoh.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Masukkan password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-11 w-full exam-gradient border-0">
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Akun guru dibuat oleh administrator. Hubungi admin jika belum memiliki akun.
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
