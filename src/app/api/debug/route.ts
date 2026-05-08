import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    return NextResponse.json({
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
}
