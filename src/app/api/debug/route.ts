import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const url = new URL(req.url);
    return NextResponse.json({
        host: req.headers.get('host'),
        nextUrlHostname: url.hostname,
        url: req.url,
    });
}
