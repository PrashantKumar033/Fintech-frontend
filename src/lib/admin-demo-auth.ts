export type AdminDemoSession = {
  email: string;
  name: string;
  role: "SUPER_ADMIN";
  signedInAt: string;
};

export const ADMIN_DEMO_CREDENTIALS = {
  email: "admin@umobipay.demo",
  password: "Admin@123",
} as const;

const STORAGE_KEY = "umobipay.admin.demo.session";

export function getAdminDemoSession(): AdminDemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminDemoSession) : null;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function signInAdminDemo(email: string, password: string): AdminDemoSession {
  if (
    email.trim().toLowerCase() !== ADMIN_DEMO_CREDENTIALS.email ||
    password !== ADMIN_DEMO_CREDENTIALS.password
  ) {
    throw new Error("Invalid demo administrator credentials.");
  }
  const session: AdminDemoSession = {
    email: ADMIN_DEMO_CREDENTIALS.email,
    name: "Super Admin",
    role: "SUPER_ADMIN",
    signedInAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function signOutAdminDemo() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
}
