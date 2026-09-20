import { neonAuth } from "@/lib/auth/server";

export default neonAuth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trade/:path*",
    "/plans/:path*",
    "/portfolio/:path*",
    "/transactions/:path*",
    "/profile/:path*",
    "/deposit/:path*",
    "/notifications/:path*",
    "/investment/:path*",
    "/admin/:path*",
  ],
};
