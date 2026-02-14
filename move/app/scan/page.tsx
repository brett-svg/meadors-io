import { requireUser } from "@/lib/auth/session";
import { ScanClient } from "@/components/scan-client";

export default async function ScanPage() {
  await requireUser();
  return <ScanClient />;
}
