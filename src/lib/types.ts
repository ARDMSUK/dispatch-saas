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
    expiryDate?: string;
    driverId?: string;
}

export interface Driver {
    id: string;
    callsign: string;
    name: string;
    phone: string;
    email?: string;
    badgeNumber?: string;
    licenseExpiry?: string;
    pin?: string;
    status: "OFF_DUTY" | "FREE" | "BUSY" | "POB";
    location?: string; // JSON
    vehicles?: Vehicle[]; // Assigned vehicles (plural)
}

export interface Account {
    id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    isActive: boolean;
    notes?: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    isAccount: boolean;
    accountId?: string;
    account?: Account;
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
}

export interface FixedPrice {
    id: string;
    name?: string;
    pickup?: string;
    dropoff?: string;
    price: number;
    vehicleType: string;
}

export interface Surcharge {
    id: string;
    name: string;
    type: "PERCENT" | "FLAT";
    value: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string;
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

export type JobStatus = typeof JOB_STATUSES[number];

export interface Job extends BookingRequest {
    id: string;
    status: JobStatus;
    createdAt: string;
    source: "WEB" | "PHONE";
    driverId?: string; // Assigned Driver
    driver?: Driver; // Expanded driver
    fare?: number; // Normalized to fare
    paymentType: "CASH" | "ACCOUNT";
    isFixedPrice: boolean;
    accountId?: string;
    account?: Account;
}
