import { useAppSettings } from "@/hooks/useAppSettings";
import { Link } from "react-router-dom";

const AppFooter = () => {
  const { settings } = useAppSettings();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {settings.school_name}. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:text-primary transition-colors">Kebijakan Privasi</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Syarat Penggunaan</Link>
          <span>·</span>
          <span>Powered by <span className="font-semibold text-primary">ExON</span> v1.8.0</span>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
