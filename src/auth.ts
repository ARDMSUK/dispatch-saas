
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Validation schema for login
const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                const validatedFields = LoginSchema.safeParse(credentials);

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;

                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { tenant: true },
                    });

                    if (!user || !user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            tenantId: user.tenantId,
                            tenantSlug: user.tenant.slug,
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async session({ session, token }: any) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.tenantId = token.impersonatedTenantId || token.tenantId; // Prefer impersonated
                session.user.tenantSlug = token.impersonatedTenantSlug || token.tenantSlug;

                // Flag to show we are impersonating
                if (token.impersonatedTenantId) {
                    session.user.isImpersonating = true;
                    session.user.originalTenantId = token.tenantId;
                }
            }
            return session;
        },
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.tenantId = user.tenantId;
                token.tenantSlug = user.tenantSlug;
            }

            // Handle Impersonation Update
            if (trigger === "update" && session?.impersonateTenantId) {
                // Verify safety: Only SUPER_ADMIN can do this
                if (token.role === 'SUPER_ADMIN') {
                    token.impersonatedTenantId = session.impersonateTenantId;
                    token.impersonatedTenantSlug = session.impersonateTenantSlug;
                }
            }
            // Stop Impersonation
            if (trigger === "update" && session?.stopImpersonation) {
                delete token.impersonatedTenantId;
                delete token.impersonatedTenantSlug;
            }

            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
});
