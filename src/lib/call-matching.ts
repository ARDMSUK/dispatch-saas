import { prisma } from './prisma';

export async function linkRecentCallToBooking(bookingId: number, phone: string, tenantId: string) {
    try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 5) return null;
        
        // Look back 15 minutes
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const phoneSuffix = cleanPhone.slice(-10); // Match last 10 digits to handle formatting diffs (+44 vs 0)
        
        const call = await prisma.incomingCall.findFirst({
            where: {
                tenantId,
                phone: { endsWith: phoneSuffix },
                createdAt: { gte: fifteenMinutesAgo },
                bookingId: null // Only link if not already linked
            },
            orderBy: { createdAt: 'desc' }
        });
        
        if (call) {
            await prisma.incomingCall.update({
                where: { id: call.id },
                data: { bookingId }
            });
            console.log(`[CALL LINK] Automatically linked call ${call.id} to booking ${bookingId}`);
            return call;
        }
    } catch (error) {
        console.error("[CALL LINK ERROR] Failed to link recent call to booking:", error);
    }
    return null;
}
