import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogIn, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { isStaff } from "@/lib/permissions";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, role, signIn } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Auto-redirect after login
  useEffect(() => {
    if (user && isStaff(role)) {
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl exam-gradient">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MTS Al Wathoniyah 43</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal Guru</p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-xl border border-border">
          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1 gap-1.5">
                <LogIn className="h-4 w-4" /> Masuk
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 gap-1.5">
                <Info className="h-4 w-4" /> Info Akun
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
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
            </TabsContent>

            <TabsContent value="info">
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Akun dibuat oleh Administrator</p>
                <p>
                  Akun <strong>Guru</strong> dibuat oleh Administrator melalui menu
                  <em> Kelola Guru</em>, dan akun <strong>Siswa</strong> melalui menu <em>Kelola Siswa</em>.
                </p>
                <p>
                  Setiap Guru hanya dapat mengelola ujian, soal, dan hasil siswa dari ujian yang dibuatnya sendiri.
                  Hubungi Administrator jika Anda belum memiliki akun atau lupa password.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Kembali ke Beranda
        </button>
      </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default AuthPage;
