import { useState, useRef, useEffect } from "react";
import { Settings as SettingsIcon, Upload, Save, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSettings } from "@/hooks/useAppSettings";
import logoDefault from "@/assets/logo-madrasah.png";

const THEMES = [
  { id: "green", label: "Hijau (Madrasah)", primary: "152 72% 30%", accent: "152 72% 36%" },
  { id: "blue", label: "Biru (Umum)", primary: "217 91% 40%", accent: "217 91% 50%" },
  { id: "teal", label: "Teal", primary: "174 72% 30%", accent: "174 72% 40%" },
  { id: "purple", label: "Ungu", primary: "262 72% 40%", accent: "262 72% 50%" },
  { id: "amber", label: "Amber", primary: "38 92% 40%", accent: "38 92% 50%" },
];

const Settings = () => {
  const { settings, refetch } = useAppSettings();
  const [schoolName, setSchoolName] = useState("");
  const [appName, setAppName] = useState("");
  const [theme, setTheme] = useState("green");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings.id) {
      setSchoolName(settings.school_name);
      setAppName(settings.app_name);
      setTheme(settings.theme);
      setLogoUrl(settings.school_logo_url);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo/school-logo.${ext}`;

    // Delete old logo first
    await supabase.storage.from("school-assets").remove([path]);

    const { error } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Gagal upload logo: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setLogoUrl(url);
    setLogoPreview(URL.createObjectURL(file));
    setUploading(false);
    toast.success("Logo berhasil diupload");
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        school_name: schoolName,
        app_name: appName,
        school_logo_url: logoUrl,
        theme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
    } else {
      toast.success("Pengaturan berhasil disimpan");
      await refetch();
    }
    setSaving(false);
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Pengaturan</h2>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Logo */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Logo Sekolah</h3>
          <div className="flex items-center gap-4">
            <img
              src={logoPreview || logoUrl || logoDefault}
              alt="Logo"
              className="h-20 w-20 rounded-xl object-contain border border-border bg-muted p-1"
            />
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" /> {uploading ? "Mengupload..." : "Ganti Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">Format: JPG, PNG. Rekomendasi: 200x200px</p>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* School & App Name */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Identitas</h3>
          <div>
            <Label>Nama Sekolah</Label>
            <Input
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="MTS Al Wathoniyah 43"
            />
            <p className="text-xs text-muted-foreground mt-1">Ditampilkan di header dan kartu ujian</p>
          </div>
          <div>
            <Label>Nama Aplikasi</Label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Sistem Ujian Online"
            />
            <p className="text-xs text-muted-foreground mt-1">Ditampilkan sebagai subtitle di halaman utama</p>
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4" /> Tema Warna
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  theme === t.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full shrink-0"
                  style={{ background: `hsl(${t.primary})` }}
                />
                <span className="text-sm font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Tema warna akan diterapkan ke seluruh aplikasi setelah disimpan
          </p>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 exam-gradient border-0 w-full h-12 text-base"
        >
          <Save className="h-5 w-5" /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default Settings;
