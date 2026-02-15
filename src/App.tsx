import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ExamPage from "./pages/ExamPage";
import ExamResult from "./pages/ExamResult";
import Dashboard from "./pages/admin/Dashboard";
import ExamManager from "./pages/admin/ExamManager";
import StudentResults from "./pages/admin/StudentResults";
import StudentManager from "./pages/admin/StudentManager";
import ProfileEdit from "./pages/admin/ProfileEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user || role !== "admin") return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/result" element={<ExamResult />} />
            <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route path="/admin/exams" element={<AdminRoute><ExamManager /></AdminRoute>} />
            <Route path="/admin/results" element={<AdminRoute><StudentResults /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><StudentManager /></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><ProfileEdit /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
