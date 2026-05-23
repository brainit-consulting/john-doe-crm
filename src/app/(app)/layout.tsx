import { requireSession } from "@/lib/auth/roles";
import { Navbar } from "./_components/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  return (
    <>
      <Navbar userName={session.user.name} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </>
  );
}
