import { effectiveRole, requireSession } from "@/lib/auth/roles";
import { Navbar } from "./_components/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isAdmin = effectiveRole(session) === "owner";
  return (
    <>
      <Navbar userName={session.user.name} isAdmin={isAdmin} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </>
  );
}
