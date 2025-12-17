import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhooks(.*)",
  "/api/auth(.*)" // allow Clerk auth endpoints to pass through
]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }
  auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/"]
};
