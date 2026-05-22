"use client";

import { createAuthClient } from "better-auth/react";
import { env as _env } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL: _env.BETTER_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
