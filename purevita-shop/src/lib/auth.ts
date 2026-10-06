import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
      }
      // client-side `useSession().update()` (e.g. after profile edit): reload name/role from DB
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { name: true, role: true },
        });
        if (fresh) {
          token.name = fresh.name;
          token.role = fresh.role as Role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
      }
      return session;
    },
  },
};

/** Server-side session (RSC, route handlers, server actions). */
export function getSession() {
  return getServerSession(authOptions);
}

/**
 * Current user or null. A JWT can outlive its DB row (e.g. after `npm run db:seed` gives users new ids);
 * such a stale session is treated as signed out so /login works again instead of looping to a 404.
 * Cached per request (layout + page share one lookup).
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) return null;
  const exists = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  return exists ? user : null;
});

/** Require a logged-in user; redirects to /login otherwise. */
export async function requireUser(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }
  return user;
}

/** Require an ADMIN; anonymous → /login, non-admin → /. */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
