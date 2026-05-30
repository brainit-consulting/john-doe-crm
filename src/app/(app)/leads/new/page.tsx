import Link from "next/link";
import { LeadForm } from "../_components/LeadForm";

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm underline">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New lead</h1>
      </div>
      <LeadForm mode="create" />
    </div>
  );
}
