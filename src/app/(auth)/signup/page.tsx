import { getInvitationByToken, isInviteUsable } from "@/lib/db/queries/invitations";
import { SignupForm, type InvitePrefill } from "./_components/SignupForm";

export default async function SignupPage(props: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite: token } = await props.searchParams;

  let invite: InvitePrefill | null = null;
  if (token) {
    const row = await getInvitationByToken(token);
    if (row && isInviteUsable(row)) {
      invite = { email: row.email, role: row.role };
    }
    // Invalid / expired / already-used invite → fall through to normal signup.
  }

  return <SignupForm invite={invite} />;
}
