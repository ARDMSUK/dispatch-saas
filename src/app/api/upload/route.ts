import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    if (!request.body) {
         return NextResponse.json({ error: "No file body" }, { status: 400 });
    }

    const uniqueFilename = `${session.user.tenantId}/${Date.now()}-${filename}`;

    const blob = await put(uniqueFilename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Blob upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
