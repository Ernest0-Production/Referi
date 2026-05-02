import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { isGitHubAccountOldEnough } from "@/shared/utils/ageCheck";
import type { UserRole } from "@prisma/client";

interface GitHubProfile {
  id: number;
  login: string;
  created_at: string;
  name?: string;
  email?: string;
}

async function upsertUserFromGitHub(data: {
  githubId: number;
  githubLogin: string;
  githubCreatedAt: Date;
  encryptedAccessToken: string;
  email?: string | null;
}) {
  const { githubId, githubLogin, githubCreatedAt, encryptedAccessToken, email } = data;

  const existingProfile = await prisma.gitHubProfile.findUnique({
    where: { githubId },
    include: { user: true },
  });

  if (existingProfile) {
    // Update access token on each login
    await prisma.user.update({
      where: { id: existingProfile.user.id },
      data: { email: email ?? undefined },
    });
    await prisma.gitHubProfile.update({
      where: { githubId },
      data: { accessToken: encryptedAccessToken, githubLogin },
    });
    return existingProfile.user;
  }

  // Create new user
  const user = await prisma.user.create({
    data: {
      displayName: githubLogin,
      email: email ?? undefined,
      roles: ["SEEKER"] as UserRole[],
      githubProfile: {
        create: {
          githubId,
          githubLogin,
          githubCreatedAt,
          accessToken: encryptedAccessToken,
          paidRegistration: false,
        },
      },
    },
    include: { githubProfile: true },
  });

  return user;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "github" || !profile) return false;

      const githubProfile = profile as unknown as GitHubProfile;
      const githubId = githubProfile.id;
      const githubCreatedAt = new Date(githubProfile.created_at);
      const encryptedAccessToken = encryptToken(account.access_token ?? "");

      const user = await upsertUserFromGitHub({
        githubId,
        githubLogin: githubProfile.login,
        githubCreatedAt,
        encryptedAccessToken,
        email: githubProfile.email ?? null,
      });

      const isOldEnough = isGitHubAccountOldEnough(githubCreatedAt);

      if (!isOldEnough) {
        const dbProfile = await prisma.gitHubProfile.findUnique({
          where: { githubId },
        });
        if (!dbProfile?.paidRegistration) {
          // Redirect to age-gate page; encode userId in query param
          return `/registration/age-gate?uid=${user.id}`;
        }
      }

      return true;
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.roles) {
        session.user.roles = token.roles as UserRole[];
      }
      if (typeof token.githubLogin === "string" && token.githubLogin.length > 0) {
        session.user.githubLogin = token.githubLogin;
      }
      return session;
    },

    async jwt({ token, account }) {
      if (account?.provider === "github" && typeof account.providerAccountId === "string") {
        const githubId = Number(account.providerAccountId);
        if (Number.isFinite(githubId)) {
          const dbUser = await prisma.user.findFirst({
            where: { githubProfile: { githubId } },
            select: {
              id: true,
              roles: true,
              githubProfile: { select: { githubLogin: true } },
            },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.roles = dbUser.roles;
            token.githubLogin = dbUser.githubProfile?.githubLogin ?? "";
            token.userClaimsLoaded = true;
          }
        }
        return token;
      }

      if (typeof token.sub !== "string") {
        return token;
      }

      const needsDbRefresh =
        !token.userClaimsLoaded &&
        (!Array.isArray(token.roles) ||
          token.roles.length === 0 ||
          token.githubLogin === undefined);

      if (needsDbRefresh) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            roles: true,
            githubProfile: { select: { githubLogin: true } },
          },
        });
        if (dbUser) {
          token.roles = dbUser.roles;
          token.githubLogin = dbUser.githubProfile?.githubLogin ?? "";
        } else {
          token.roles = [];
          token.githubLogin = "";
        }
        token.userClaimsLoaded = true;
      }

      return token;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login/error",
  },

  secret: env.NEXTAUTH_SECRET,
});
