import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
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
}) {
  const { githubId, githubLogin, githubCreatedAt, encryptedAccessToken } = data;

  const existingProfile = await prisma.gitHubProfile.findUnique({
    where: { githubId },
    include: { user: true },
  });

  if (existingProfile) {
    // Update access token on each login
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
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
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
        (session.user as typeof session.user & { roles: UserRole[] }).roles =
          token.roles as UserRole[];
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { roles: true },
        });
        token.roles = dbUser?.roles ?? [];
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
});
