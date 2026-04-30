import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Verdelimp ERP",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.active) return null;

        // Verificar bloqueio por tentativas
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Conta bloqueada. Tente novamente mais tarde.");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!valid) {
          const attempts = user.failedAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: attempts,
              lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
            },
          });
          return null;
        }

        // Reset tentativas após login bem-sucedido
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          mustChangePass: user.mustChangePass,
          roles: user.roles.map((ur) => ur.role.name),
        };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles;
        token.mustChangePass = (user as any).mustChangePass;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roles = token.roles;
        (session.user as any).mustChangePass = token.mustChangePass;
      }
      return session;
    },
  },

  pages: { signIn: "/login", error: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
