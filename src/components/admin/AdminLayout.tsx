import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, FileText, Users, LogOut, UserPlus, UserCog, Settings, ShieldAlert, Eye, Sparkles, Cloud, FlaskConical, ChevronDown, GraduationCap, Library, School } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WhatsNewDialog from "@/components/admin/WhatsNewDialog";
import AppFooter from "@/components/AppFooter";
import logoMadrasah from "@/assets/logo-madrasah.png";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";

const navItems: { path: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { path: "/admin/monitor", label: "Monitor", icon: Eye, permission: "monitor" },
  { path: "/admin/sync", label: "Status Sync", icon: Cloud, permission: "sync" },
  { path: "/admin/exams", label: "Kelola Ujian", icon: FileText, permission: "exams" },
  { path: "/admin/bank", label: "Bank Soal", icon: Library, permission: "bank" },

  { path: "/admin/results", label: "Hasil Siswa", icon: Users, permission: "results" },
  { path: "/admin/students", label: "Kelola Siswa", icon: UserPlus, permission: "students" },
  { path: "/admin/classes", label: "Manajemen Kelas", icon: School, permission: "classes" },
  { path: "/admin/teachers", label: "Kelola Guru", icon: GraduationCap, permission: "teachers" },
  { path: "/admin/violations", label: "Pelanggaran", icon: ShieldAlert, permission: "violations" },
  { path: "/admin/anti-cheat-test", label: "Uji Anti-Cheat", icon: FlaskConical, permission: "anticheat_test" },
  { path: "/admin/profile", label: "Profil Guru", icon: UserCog, permission: "profile" },
  { path: "/admin/settings", label: "Pengaturan", icon: Settings, permission: "settings" },
];

const desktopPrimaryPaths = [
  "/admin",
  "/admin/monitor",
  "/admin/exams",
  "/admin/bank",
  "/admin/results",
  "/admin/students",
];

const tabletPrimaryPaths = ["/admin", "/admin/monitor"];
const mobilePrimaryPaths = ["/admin"];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const { settings } = useAppSettings();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  const visibleItems = navItems.filter((item) => can(role, item.permission));

  const renderPrimaryItems = (primaryPaths: string[]) =>
    visibleItems
      .filter((item) => primaryPaths.includes(item.path))
      .map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Button
            key={path}
            type="button"
            variant="ghost"
            onClick={() => navigate(path)}
            className={`h-11 shrink-0 rounded-none border-b-2 px-3 text-sm font-medium sm:px-4 ${
              isActive
                ? "border-primary text-primary hover:text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </Button>
        );
      });

  const renderMoreMenu = (primaryPaths: string[]) => {
    const moreItems = visibleItems.filter((item) => !primaryPaths.includes(item.path));
    const hasActiveItem = moreItems.some((item) => location.pathname === item.path);

    if (moreItems.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={`h-11 shrink-0 rounded-none border-b-2 px-3 text-sm font-medium sm:px-4 ${
              hasActiveItem
                ? "border-primary text-primary hover:text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Lainnya <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {moreItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <DropdownMenuItem
                key={path}
                onSelect={() => navigate(path)}
                className={`gap-2 ${isActive ? "bg-accent font-semibold text-accent-foreground" : ""}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:hidden">
          <div className="flex min-w-0 items-center">{renderPrimaryItems(mobilePrimaryPaths)}</div>
          {renderMoreMenu(mobilePrimaryPaths)}
        </div>
        <div className="mx-auto hidden max-w-7xl items-center justify-between px-4 sm:flex lg:hidden sm:px-6">
          <div className="flex min-w-0 items-center">{renderPrimaryItems(tabletPrimaryPaths)}</div>
          {renderMoreMenu(tabletPrimaryPaths)}
        </div>
        <div className="mx-auto hidden max-w-7xl items-center justify-between px-6 lg:flex">
          <div className="flex min-w-0 items-center">{renderPrimaryItems(desktopPrimaryPaths)}</div>
          {renderMoreMenu(desktopPrimaryPaths)}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>

      <AppFooter />

      <WhatsNewDialog externalOpen={whatsNewOpen} onExternalClose={() => setWhatsNewOpen(false)} />
    </div>
  );
};

export default AdminLayout;
