import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { driverId, jobId, active } = body;

    if (!driverId) {
      return new NextResponse('Missing driverId', { status: 400 });
    }

    // Toggle emergencyActive on the driver's active job if jobId is provided
    if (jobId) {
      await prisma.job.update({
        where: { id: jobId, tenantId: user.tenantId },
        data: { emergencyActive: active },
      });
    }

    // Log the emergency event (could be a message or a separate log)
    if (active) {
      await prisma.driverMessage.create({
        data: {
          tenantId: user.tenantId,
          driverId,
          jobId,
          content: '🚨 PANIC ALERT ACTIVATED 🚨',
          sender: 'DRIVER',
          isRead: false,
        },
      });
    }

    return NextResponse.json({ success: true, emergencyActive: active });
  } catch (error) {
    console.error('Error toggling emergency:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
