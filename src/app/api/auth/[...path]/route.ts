import { neonAuth } from "@/lib/auth/server";

export const { GET, POST } = neonAuth.handler();
