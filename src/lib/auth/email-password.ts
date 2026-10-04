/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Mesh uses the Neon database, so email/password is on. Forms use
 * `authClient.signUp.email` / `authClient.signIn.email` from `@/lib/auth/client`.
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = true;
