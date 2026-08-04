import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, FileText, Users, LogOut, UserPlus, UserCog, Settings, ShieldAlert, Eye, Sparkles, Cloud, FlaskConical, Menu, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WhatsNewDialog from "@/components/admin/WhatsNewDialog";
import AppFooter from "@/components/AppFooter";
import logoMadrasah from "@/assets/logo-madrasah.png";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";

const navItems: { path: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { path: "/admin/monitor", label: "Monitor", icon: Eye, permission: "monitor" },
  { path: "/admin/sync", label: "Status Sync", icon: Cloud, permission: "sync" },
  { path: "/admin/exams", label: "Kelola Ujian", icon: FileText, permission: "exams" },
  { path: "/admin/results", label: "Hasil Siswa", icon: Users, permission: "results" },
  { path: "/admin/students", label: "Kelola Siswa", icon: UserPlus, permission: "students" },
  { path: "/admin/teachers", label: "Kelola Guru", icon: GraduationCap, permission: "teachers" },
  { path: "/admin/violations", label: "Pelanggaran", icon: ShieldAlert, permission: "violations" },
  { path: "/admin/anti-cheat-test", label: "Uji Anti-Cheat", icon: FlaskConical, permission: "anticheat_test" },
  { path: "/admin/profile", label: "Profil Guru", icon: UserCog, permission: "profile" },
  { path: "/admin/settings", label: "Pengaturan", icon: Settings, permission: "settings" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { settings } = useAppSettings();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  const visibleItems = navItems.filter((item) => can(role, item.permission));

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="exam-gradient px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={settings.school_logo_url || logoMadrasah} alt="Logo" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="text-base font-bold text-white">{settings.school_name}</h1>
              <p className="flex items-center gap-2 text-xs text-white/70">
                {profile?.full_name || "Guru"}
                {role && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
                    {ROLE_LABELS[role]}
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setWhatsNewOpen(true)} className="text-white hover:bg-white/20 gap-2" size="sm">
              <Sparkles className="h-4 w-4" /> What's New
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-white/20 gap-2">
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:hidden">
          <Menu className="h-4 w-4" /> Geser menu ke samping
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {visibleItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors sm:px-4 ${
                location.pathname === path
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>

      <AppFooter />

      <WhatsNewDialog externalOpen={whatsNewOpen} onExternalClose={() => setWhatsNewOpen(false)} />
    </div>
  );
};

export default AdminLayout;
