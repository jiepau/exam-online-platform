export type AppRole = "admin" | "teacher" | "student";

export type Permission =
  | "dashboard"
  | "monitor"
  | "sync"
  | "exams"
  | "results"
  | "students"
  | "teachers"
  | "violations"
  | "anticheat_test"
  | "profile"
  | "settings";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    "dashboard",
    "monitor",
    "sync",
    "exams",
    "results",
    "students",
    "teachers",
    "violations",
    "anticheat_test",
    "profile",
    "settings",
  ],
  // Guru: hanya data ujian miliknya sendiri
  teacher: ["dashboard", "monitor", "exams", "results", "violations", "anticheat_test", "profile"],
  student: [],
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  teacher: "Guru",
  student: "Siswa",
};

export const isStaff = (role: AppRole | null): boolean => role === "admin" || role === "teacher";

export const can = (role: AppRole | null, permission: Permission): boolean =>
  !!role && ROLE_PERMISSIONS[role]?.includes(permission);
