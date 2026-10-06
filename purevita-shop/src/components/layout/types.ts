/** Minimal user info the header needs. Phase 4 passes this from getServerSession(authOptions). */
export type HeaderUser = { name?: string | null; role?: string | null } | null;
