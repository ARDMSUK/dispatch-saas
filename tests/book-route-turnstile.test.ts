import { NextRequest, NextResponse } from 'next/server';
import { POST } from './src/app/api/booker/[slug]/book/route';
import { prisma } from './src/lib/prisma';
import * as passengerAuth from './src/lib/passenger-auth';

// Mock dependencies
jest.mock('./src/lib/prisma', () => ({
    prisma: {
        company: {
            findFirst: jest.fn(),
        },
        job: {
            count: jest.fn(),
            create: jest.fn(),
        },
        customer: {
            findFirst: jest.fn(),
        }
    }
}));

jest.mock('./src/lib/passenger-auth', () => ({
    verifyPassengerToken: jest.fn(),
}));

describe('Book Route Turnstile bypass', () => {
    let originalEnv: NodeJS.ProcessEnv;
    const MOCK_COMPANY = { id: 'tenant-123', slug: 'passenger-e2e', enableWebBooker: true };

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'secret' };
        jest.clearAllMocks();
        
        (prisma.company.findFirst as jest.Mock).mockResolvedValue(MOCK_COMPANY);
        (prisma.job.count as jest.Mock).mockResolvedValue(0);
        (prisma.job.create as jest.Mock).mockResolvedValue({ id: 'job-123' });
        global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true }) }) as any;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    function createReq(body: any = {}, headers: Record<string, string> = {}) {
        return new NextRequest('http://localhost/api/booker/passenger-e2e/book', {
            method: 'POST',
            body: JSON.stringify({
                pickupLat: 51.5, pickupLng: -0.1, dropoffLat: 51.6, dropoffLng: -0.2,
                pickup: 'A', dropoff: 'B', passengerName: 'Test', passengerPhone: '123',
                passengers: 1, luggage: 0, serviceType: 'Saloon', vehicleClass: 'Saloon',
                price: 10, paymentType: 'CASH', ...body
            }),
            headers: new Headers({ 'content-type': 'application/json', ...headers })
        });
    }

    test('1. valid Passenger JWT + no turnstileToken -> booking reaches normal processing', async () => {
        (passengerAuth.verifyPassengerToken as jest.Mock).mockResolvedValue({ tenantId: 'tenant-123' });
        const req = createReq({}, { 'authorization': 'Bearer valid' });
        const res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) }) as NextResponse;
        const json = await res.json();
        // Since we mocked everything to succeed, it should reach the end and return a job id, NOT a security error
        expect(res.status).toBe(201);
        expect(json.jobId).toBe('job-123');
    });

    test('2. invalid Passenger JWT -> 401', async () => {
        (passengerAuth.verifyPassengerToken as jest.Mock).mockResolvedValue(null);
        const req = createReq({}, { 'authorization': 'Bearer invalid' });
        const res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) }) as NextResponse;
        expect(res.status).toBe(401);
    });

    test('3. no JWT + no turnstileToken -> existing security-token failure remains', async () => {
        const req = createReq({});
        const res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) }) as NextResponse;
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toBe('Security token missing. Please refresh the page.');
    });

    test('4. public Web Booker with valid Turnstile -> continues working', async () => {
        const req = createReq({ turnstileToken: 'valid_turnstile_token' });
        const res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) }) as NextResponse;
        expect(res.status).toBe(201);
    });

    test('5. cross-tenant Passenger JWT -> denied', async () => {
        (passengerAuth.verifyPassengerToken as jest.Mock).mockResolvedValue({ tenantId: 'wrong-tenant' });
        const req = createReq({}, { 'authorization': 'Bearer valid' });
        const res = await POST(req, { params: Promise.resolve({ slug: 'passenger-e2e' }) }) as NextResponse;
        expect(res.status).toBe(403);
    });
});
