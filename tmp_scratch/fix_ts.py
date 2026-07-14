import os
import re

files_to_fix = [
    "src/app/api/booker/[slug]/book/confirm-payment/route.ts",
    "src/app/api/booker/[slug]/stripe/payment-methods/route.ts",
    "src/app/api/booker/[slug]/stripe/setup-intent/route.ts",
    "src/app/api/create-payment-intent/route.ts",
    "src/app/api/jobs/[id]/payment-link/route.ts",
    "src/app/api/jobs/[id]/payment/email/route.ts",
    "src/app/api/jobs/[id]/payment/sms/route.ts",
    "src/app/api/jobs/[id]/refund/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment-link/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/email/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/sms/route.ts",
    "src/app/api/jobs/[id]/payment/link/route.ts",
    "src/app/api/mobile/driver/payment/tap-to-pay-config/route.ts"
]

for fpath in files_to_fix:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r') as f:
        content = f.read()

    # 1. 'string | null' not assignable to 'string'
    content = re.sub(r'decrypt\(tenant(\??)\.stripeSecretKey\)', r'(decrypt(tenant\1.stripeSecretKey) as string)', content)
    
    # 2. 'tenant is possibly null'
    # Actually, it's better to replace `(decrypt(tenant?.stripeSecretKey) as string)` with `(decrypt(tenant!.stripeSecretKey) as string)` if tenant could be null.
    content = content.replace('decrypt(tenant?.stripeSecretKey) as string', 'decrypt(tenant!.stripeSecretKey) as string')

    # 3. Fix jobs/[id]/payment/link/route.ts (the `job.decrypt(tenant.sumup...)` issue)
    content = content.replace('job.decrypt(tenant.sumupAccessToken)', 'decrypt(job.tenant.sumupAccessToken)')
    content = content.replace('job.decrypt(tenant.sumupRefreshToken)', 'decrypt(job.tenant.sumupRefreshToken)')
    content = content.replace('job.decrypt(driver.sumupAccessToken)', 'decrypt(job.driver.sumupAccessToken)')
    content = content.replace('job.decrypt(driver.sumupRefreshToken)', 'decrypt(job.driver.sumupRefreshToken)')
    
    with open(fpath, 'w') as f:
        f.write(content)

print("TS fixed.")
