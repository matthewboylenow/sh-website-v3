import { handlers } from "@/auth";

// All Auth.js routes go through this catch-all:
//   /api/auth/signin            (POST - start email/sms flow)
//   /api/auth/callback/email    (GET  - magic-link click)
//   /api/auth/callback/sms      (POST - sms code submit)
//   /api/auth/signout
//   /api/auth/session
export const { GET, POST } = handlers;
