import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md card p-5">
      <h1 className="text-xl font-semibold mb-3">Login</h1>
      <LoginForm />
      <p className="text-sm text-slate-500 mt-3">Default seeded user: admin / move1234</p>
    </main>
  );
}
