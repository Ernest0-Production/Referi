import type { DefaultSession } from "next-auth";
import type { StaffRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      staffRoles: StaffRole[];
      githubLogin?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffRoles?: StaffRole[];
    githubLogin?: string;
    userClaimsLoaded?: boolean;
  }
}
