import { z } from "zod";

export const BookingSchema = z.object({
    passengerName: z.string().min(1),
    passengerPhone: z.string().min(1),
    passengerEmail: z.string().email().optional(),
    pickupAddress: z.string().min(1),
    dropoffAddress: z.string().min(1),
    pickupTime: z.string().datetime().optional(), // ISO string
    passengers: z.number().int().min(1).default(1),
    notes: z.string().optional(),
    tenantId: z.string().min(1), // Who this booking is for
});


export type BookingRequest = z.infer<typeof BookingSchema>;

export interface Vehicle {
    id: string;
    reg: string;
    make: string;
    model: string;
    color?: string;
    type: string;
    expiryDate?: string; // ISO String from API
    driverId?: string | null;
    driver?: Driver | null;
}

export interface Driver {
    id: string;
    callsign: string;
    name: string;
    phone: string;
    email?: string | null;
    badgeNumber?: string | null;
    licenseExpiry?: string | null; // ISO String
    pin?: string | null;
    status: "OFF_DUTY" | "FREE" | "BUSY" | "POB" | string;
    location?: string | null; // JSON
    vehicles?: Vehicle[];
    tenantId: string;
}

export interface Account {
    id: string;
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    isActive: boolean;
    notes?: string | null;
}

export interface Customer {
    id: string;
    name: string | null;
    phone: string;
    email?: string | null;
    notes?: string | null;
    isAccount: boolean;
    accountId?: string | null;
    account?: Account | null;
    history?: {
        address: string;
        count: number;
        lastUsed: string;
    }[];
}

export interface PricingRule {
    id: string;
    name: string;
    vehicleType: string;
    baseRate: number;
    perMile: number;
    minFare: number;
    waitingFreq: number;
}

export interface FixedPrice {
    id: string;
    name?: string | null;
    pickup?: string | null;
    dropoff?: string | null;
    price: number;
    vehicleType: string;
    isReverse: boolean;
}

export interface Surcharge {
    id: string;
    name: string;
    type: "PERCENT" | "FLAT";
    value: number;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null; // "HH:MM"
    endTime?: string | null;
    daysOfWeek?: string | null;
}

// Job Status Definitions
export const JOB_STATUSES = [
    "PENDING",
    "UNASSIGNED",
    "DISPATCHED",
    "EN_ROUTE",
    "POB",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW"
] as const;

export type JobStatus = typeof JOB_STATUSES[number] | string;

export interface Job {
    id: number; // Prisma uses Int for Job ID
    pickupAddress: string;
    dropoffAddress: string;
    pickupTime: string; // ISO
    passengerName: string;
    passengerPhone: string;
    passengers: number;
    luggage: number;
    vehicleType: string;
    status: JobStatus;
    notes?: string | null;
    flightNumber?: string | null;

    // Financials
    fare?: number | null;
    paymentType: "CASH" | "ACCOUNT" | "CARD" | string;
    isFixedPrice: boolean;
    waitingTime: number;
    waitingCost: number;

    // Relationships
    driverId?: string | null;
    driver?: Driver | null;
    accountId?: string | null;
    account?: Account | null;
    customer?: Customer | null;
}

