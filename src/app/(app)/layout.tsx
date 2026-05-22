import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { Navbar } from "./_components/Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  return (
    <>
      <Navbar userName={session.user.name} />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </>
  );
}
