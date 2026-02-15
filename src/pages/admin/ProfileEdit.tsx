import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ProfileEdit = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    nip: "",
    nuptk: "",
    subject: "",
    birth_place: "",
    birth_date: "",
    whatsapp: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, nip, nuptk, subject, birth_place, birth_date, whatsapp")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || "",
            nip: data.nip || "",
            nuptk: data.nuptk || "",
            subject: data.subject || "",
            birth_place: data.birth_place || "",
            birth_date: data.birth_date || "",
            whatsapp: data.whatsapp || "",
          });
        }
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        nip: form.nip || null,
        nuptk: form.nuptk || null,
        subject: form.subject || null,
        birth_place: form.birth_place || null,
        birth_date: form.birth_date || null,
        whatsapp: form.whatsapp || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Gagal menyimpan profil");
    } else {
      toast.success("Profil berhasil diperbarui");
    }
    setLoading(false);
  };

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const fields = [
    { key: "full_name", label: "Nama Lengkap", placeholder: "Masukkan nama lengkap", type: "text" },
    { key: "nip", label: "NIP / NIK", placeholder: "Masukkan NIP atau NIK", type: "text" },
    { key: "nuptk", label: "NUPTK / PEGID", placeholder: "Masukkan NUPTK atau PEGID", type: "text" },
    { key: "subject", label: "Mata Pelajaran", placeholder: "Contoh: Matematika", type: "text" },
    { key: "birth_place", label: "Tempat Lahir", placeholder: "Contoh: Jakarta", type: "text" },
    { key: "birth_date", label: "Tanggal Lahir", placeholder: "", type: "date" },
    { key: "whatsapp", label: "No. WhatsApp", placeholder: "Contoh: 08123456789", type: "tel" },
  ];

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Edit Profil Guru</h2>
      <div className="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
              <Input
                type={type}
                value={(form as any)[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className={key === "nip" || key === "nuptk" ? "font-mono" : ""}
              />
            </div>
          ))}
          <Button type="submit" disabled={loading} className="w-full exam-gradient border-0 gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default ProfileEdit;
