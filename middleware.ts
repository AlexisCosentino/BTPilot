import { clerkMiddleware } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/api/(.*)",
  ],
};
