import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import SplashScreen from "@/components/SplashScreen";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { can, isStaff, type Permission } from "@/lib/permissions";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ExamPage from "./pages/ExamPage";
import ExamResult from "./pages/ExamResult";
import Dashboard from "./pages/admin/Dashboard";
import ExamManager from "./pages/admin/ExamManager";
import QuestionBank from "./pages/admin/QuestionBank";

import StudentResults from "./pages/admin/StudentResults";
import StudentManager from "./pages/admin/StudentManager";
import TeacherManager from "./pages/admin/TeacherManager";
import ProfileEdit from "./pages/admin/ProfileEdit";
import StudentResultDetail from "./pages/admin/StudentResultDetail";
import Settings from "./pages/admin/Settings";
import ViolationHistory from "./pages/admin/ViolationHistory";
import LiveMonitor from "./pages/admin/LiveMonitor";
import SyncStatus from "./pages/admin/SyncStatus";
import AntiCheatTest from "./pages/admin/AntiCheatTest";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

const queryClient = new QueryClient();

const StaffRoute = ({ permission, children }: { permission: Permission; children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user || !isStaff(role)) return <Navigate to="/auth" replace />;
  if (!can(role, permission)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <PWAInstallPrompt />
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/exam" element={<ExamPage />} />
              <Route path="/result" element={<ExamResult />} />
              <Route path="/admin" element={<StaffRoute permission="dashboard"><Dashboard /></StaffRoute>} />
              <Route path="/admin/monitor" element={<StaffRoute permission="monitor"><LiveMonitor /></StaffRoute>} />
              <Route path="/admin/exams" element={<StaffRoute permission="exams"><ExamManager /></StaffRoute>} />
              <Route path="/admin/results" element={<StaffRoute permission="results"><StudentResults /></StaffRoute>} />
              <Route path="/admin/results/:sessionId" element={<StaffRoute permission="results"><StudentResultDetail /></StaffRoute>} />
              <Route path="/admin/students" element={<StaffRoute permission="students"><StudentManager /></StaffRoute>} />
              <Route path="/admin/teachers" element={<StaffRoute permission="teachers"><TeacherManager /></StaffRoute>} />
              <Route path="/admin/profile" element={<StaffRoute permission="profile"><ProfileEdit /></StaffRoute>} />
              <Route path="/admin/settings" element={<StaffRoute permission="settings"><Settings /></StaffRoute>} />
              <Route path="/admin/violations" element={<StaffRoute permission="violations"><ViolationHistory /></StaffRoute>} />
              <Route path="/admin/sync" element={<StaffRoute permission="sync"><SyncStatus /></StaffRoute>} />
              <Route path="/admin/anti-cheat-test" element={<StaffRoute permission="anticheat_test"><AntiCheatTest /></StaffRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
