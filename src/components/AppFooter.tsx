import { useAppSettings } from "@/hooks/useAppSettings";

const AppFooter = () => {
  const { settings } = useAppSettings();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {settings.school_name}. All rights reserved.</p>
        <p>Powered by <span className="font-semibold text-primary">ExON</span> v1.8.0</p>
      </div>
    </footer>
  );
};

export default AppFooter;
