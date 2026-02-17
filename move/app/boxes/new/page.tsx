import { requireUser } from "@/lib/auth/session";
import { NewBoxForm } from "@/components/new-box-form";

export default async function NewBoxPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  await requireUser();
  const { room } = await searchParams;

  return (
    <main className="card p-4">
      <h1 className="text-xl font-semibold mb-3">Create Box</h1>
      <NewBoxForm initialRoom={room} />
    </main>
  );
}
