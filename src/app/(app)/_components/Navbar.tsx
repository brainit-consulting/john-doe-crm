import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-display text-lg font-semibold">John Doe CRM</Link>
          <Link href="/leads" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Leads</Link>
          <Link href="/clients" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Clients</Link>
          <Link href="/invoices" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Invoices</Link>
          <Link href="/notes" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Notes</Link>
          {isAdmin ? (
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">Admin</Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">{userName}</span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
