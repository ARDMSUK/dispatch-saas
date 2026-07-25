import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

interface AuditEventParams {
    tenantId?: string | null;
    userId?: string | null;
    actorRole?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    req?: NextRequest | Request | null;
    details?: Record<string, any>;
}

const MASKED_KEYS = ['password', 'secret', 'key', 'token'];

function maskSecrets(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(maskSecrets);
    }

    const maskedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
        const lowerKey = k.toLowerCase();
        if (MASKED_KEYS.some(maskKey => lowerKey.includes(maskKey))) {
            maskedObj[k] = '********';
        } else {
            maskedObj[k] = maskSecrets(v);
        }
    }
    return maskedObj;
}

export async function logAuditEvent(params: AuditEventParams) {
    try {
        let ipAddress = null;
        let userAgent = null;

        if (params.req) {
            ipAddress = params.req.headers.get('x-forwarded-for') || null;
            userAgent = params.req.headers.get('user-agent') || null;
        }

        const safeDetails = params.details ? maskSecrets(params.details) : null;

        await prisma.auditLog.create({
            data: {
                tenantId: params.tenantId || null,
                userId: params.userId || null,
                actorRole: params.actorRole || null,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId || null,
                ipAddress,
                userAgent,
                details: safeDetails ? JSON.parse(JSON.stringify(safeDetails)) : null,
            }
        });
        return true;
    } catch (error) {
        console.error('[AUDIT_LOG_ERROR] Failed to insert audit log:', error);
        // Do not throw, survive user flow
        return false;
    }
}
