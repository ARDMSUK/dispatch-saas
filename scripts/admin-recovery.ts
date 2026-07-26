import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { logAuditEvent } from '../src/lib/audit-logger'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const isConfirmed = args.includes('--confirm')
  
  if (!isDryRun && !isConfirmed) {
    console.error("Error: You must specify either --dry-run or --confirm")
    process.exit(1)
  }
  
  if (isDryRun && isConfirmed) {
    console.error("Error: Cannot specify both --dry-run and --confirm")
    process.exit(1)
  }

  const mode = isDryRun ? "DRY RUN" : "CONFIRMED"
  
  const actionIndex = args.findIndex(a => a === 'unlock-tenant' || a === 'reset-admin')
  if (actionIndex === -1) {
    console.error("Error: Missing action (unlock-tenant or reset-admin)")
    process.exit(1)
  }
  
  const action = args[actionIndex]
  const target = args[actionIndex + 1]
  
  if (!target || target.startsWith('--')) {
    console.error(`Error: Missing target for action ${action}`)
    process.exit(1)
  }
  
  console.log(`[${mode}] Starting admin recovery...`)
  
  if (action === 'unlock-tenant') {
    const tenantSlug = target
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }})
    if (!tenant) {
      console.error(`[${mode}] Error: Tenant with slug ${tenantSlug} not found.`)
      const success = await logAuditEvent({ action: 'UNLOCK_TENANT_FAILED', resource: 'Tenant', details: { reason: 'not_found', target: tenantSlug } })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for failed lookup.')
      process.exit(1)
    }
    
    console.log(`[${mode}] Found tenant: ${tenant.name} (Status: ${tenant.subscriptionStatus})`)
    
    if (isDryRun) {
      console.log(`[${mode}] Would update subscriptionStatus from ${tenant.subscriptionStatus} to ACTIVE`)
      const success = await logAuditEvent({ tenantId: tenant.id, action: 'UNLOCK_TENANT_DRY_RUN', resource: 'Tenant', resourceId: tenant.id, details: { previousStatus: tenant.subscriptionStatus } })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for dry-run.')
    } else {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: 'ACTIVE' }
      })
      const success = await logAuditEvent({
        tenantId: tenant.id,
        action: 'UNLOCK_TENANT_CLI',
        resource: 'Tenant',
        resourceId: tenant.id,
        details: { previousStatus: tenant.subscriptionStatus }
      })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for successful unlock.')
      console.log(`[${mode}] Successfully updated tenant ${tenant.name} to ACTIVE`)
    }
  } else if (action === 'reset-admin') {
    const email = target
    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } })
    if (!user) {
      console.error(`[${mode}] Error: User with email ${email} not found.`)
      const success = await logAuditEvent({ action: 'RESET_ADMIN_FAILED', resource: 'User', details: { reason: 'not_found', target: email } })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for failed lookup.')
      process.exit(1)
    }
    
    console.log(`[${mode}] Found user: ${user.name} (${user.role}) for tenant ${user.tenant.name}`)
    
    if (isDryRun) {
      console.log(`[${mode}] Would generate temporary password, hash it, and set forcePasswordReset = true`)
      const success = await logAuditEvent({ tenantId: user.tenantId, userId: user.id, action: 'RESET_ADMIN_DRY_RUN', resource: 'User', resourceId: user.id, details: { forcedReset: true } })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for dry-run.')
    } else {
      const tempPassword = crypto.randomBytes(8).toString('hex')
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          forcePasswordReset: true,
          resetToken: null,
          resetTokenExpiry: null
        }
      })
      
      const success = await logAuditEvent({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'RESET_ADMIN_CLI',
        resource: 'User',
        resourceId: user.id,
        details: { forcedReset: true }
      })
      if (!success) console.warn('[WARNING] Failed to write AuditLog for successful reset.')
      
      console.log(`[${mode}] Successfully reset password for ${email}`)
      console.log(`[${mode}] TEMPORARY PASSWORD: ${tempPassword}`)
      console.log(`[${mode}] Please provide this securely. They will be forced to change it on login.`)
    }
  }
}

main().catch(e => {
  console.error("Script failed:", e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
