import { requireUser } from "@/lib/auth/session";
import { NewBoxForm } from "@/components/new-box-form";

export default async function NewBoxPage() {
  await requireUser();

  return (
    <main className="card p-4">
      <h1 className="text-xl font-semibold mb-3">Create Box</h1>
      <NewBoxForm />
    </main>
  );
}
