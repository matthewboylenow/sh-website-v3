import type { DefaultSession } from "next-auth";

type Role = "admin" | "editor" | "ministry_lead";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      ministryId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    ministryId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    ministryId?: string | null;
  }
}
