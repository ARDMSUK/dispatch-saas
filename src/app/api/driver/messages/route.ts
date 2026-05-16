import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return new NextResponse('Missing driverId', { status: 400 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messages = await prisma.driverMessage.findMany({
      where: {
        tenantId: user.tenantId,
        driverId: driverId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching driver messages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { driverId, jobId, content, sender } = body;

    if (!driverId || !content) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const message = await prisma.driverMessage.create({
      data: {
        tenantId: user.tenantId,
        driverId,
        jobId,
        content,
        sender: sender || 'DRIVER',
        isRead: false,
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating driver message:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
