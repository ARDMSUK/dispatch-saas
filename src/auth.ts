
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
                twoFactorToken: {}, // Optional token passed during step 2
            },
            authorize: async (credentials) => {
                const validatedFields = LoginSchema.safeParse(credentials);

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;
                    const twoFactorToken = credentials.twoFactorToken as string | undefined;

                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { tenant: true },
                    });

                    if (!user || !user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) {
                        // 2FA Challenge Logic
                        if (user.twoFactorEnabled && user.twoFactorSecret) {
                            if (!twoFactorToken) {
                                // First step: user only provided password. We reject but indicate 2FA is needed.
                                throw new Error("2FA_REQUIRED");
                            }

                            // Second step: user provided password AND token. Verify token.
                            const speakeasy = (await import('speakeasy')).default;
                            const isValid = speakeasy.totp.verify({
                                secret: user.twoFactorSecret,
                                encoding: 'base32',
                                token: twoFactorToken,
                                window: 1
                            });

                            if (!isValid) {
                                throw new Error("INVALID_2FA_TOKEN");
                            }
                        }

                        // Fully Authenticated
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            accountId: user.accountId,
                            tenantId: user.tenantId,
                            tenantSlug: user.tenant.slug,
                            permissions: user.permissions as string[] || [], // Typecast and default
                            forcePasswordReset: user.forcePasswordReset,
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {

        async session({ session, token }: any) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.permissions = token.permissions || [];
                session.user.accountId = token.accountId;
                session.user.tenantId = token.impersonatedTenantId || token.tenantId; // Prefer impersonated
                session.user.tenantSlug = token.impersonatedTenantSlug || token.tenantSlug;
                session.user.forcePasswordReset = token.forcePasswordReset;

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
                token.permissions = user.permissions;
                token.accountId = user.accountId;
                token.tenantId = user.tenantId;
                token.tenantSlug = user.tenantSlug;
                token.forcePasswordReset = user.forcePasswordReset;
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
