
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string;
            role: string;
            tenantId: string;
            tenantSlug: string;
        } & DefaultSession["user"]
    }

    interface User {
        role: string;
        tenantId: string;
        tenantSlug: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        tenantId: string;
        tenantSlug: string;
    }
}
