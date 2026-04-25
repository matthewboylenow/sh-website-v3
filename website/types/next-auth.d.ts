import type { DefaultSession } from "next-auth";

type Role = "admin" | "editor" | "ministry_lead";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      /**
       * Ministries this user leads, sourced from the ministry_leads
       * join table at JWT-mint time. Empty array for admins/editors
       * who don't also lead a ministry.
       */
      ministryIds: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: Role;
    ministryIds?: string[];
  }
}
