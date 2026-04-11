import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { BillingSettingsClient } from './billing-client';

export default async function BillingSettingsPage() {
    const session = await auth();
    if (!session || !session.user || !session.user.tenantId) {
        redirect('/login');
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: {
            id: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            subscriptionStatus: true,
        }
    });

    if (!tenant) redirect('/login');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Subscription & Billing</h3>
                <p className="text-sm text-slate-500">
                    Manage your platform subscription, update payment methods, and view your invoice history.
                </p>
            </div>

            <BillingSettingsClient
                tenantId={tenant.id}
                status={tenant.subscriptionStatus}
                plan={"Basic"}
                hasCustomerProfile={!!tenant.stripeCustomerId}
            />
        </div>
    );
}
