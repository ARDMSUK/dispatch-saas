import os
import re

files = [
    "src/app/api/create-payment-intent/route.ts",
    "src/app/api/mobile/driver/payment/connection-token/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/sms/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/email/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment-link/route.ts",
    "src/app/api/jobs/[id]/payment/sms/route.ts",
    "src/app/api/jobs/[id]/payment/email/route.ts",
    "src/app/api/jobs/[id]/payment-link/route.ts",
    "src/app/api/jobs/[id]/refund/route.ts",
    "src/app/api/booker/[slug]/book/confirm-payment/route.ts",
    "src/app/api/booker/[slug]/stripe/setup-intent/route.ts",
    "src/app/api/booker/[slug]/stripe/payment-methods/route.ts",
    "src/app/api/integrations/sumup/callback/route.ts",
    "src/app/api/integrations/zettle/callback/route.ts",
    "src/app/api/driver/integrations/sumup/callback/route.ts",
    "src/app/api/mobile/driver/payment/tap-to-pay-config/route.ts",
    "src/app/api/jobs/[id]/payment/link/route.ts"
]

import_statement = "import { encrypt, decrypt } from '@/lib/encryption';\n"

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r') as f:
        content = f.read()
    
    if "import { decrypt }" in content or "import { encrypt, decrypt }" in content:
        continue
        
    # Inject import after the last import statement
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import_idx = i
            
    if last_import_idx != -1:
        lines.insert(last_import_idx + 1, "import { encrypt, decrypt } from '@/lib/encryption';")
        content = '\n'.join(lines)
    else:
        content = import_statement + content

    # STRIPE
    content = re.sub(r'tenant(\??)\.stripeSecretKey', r'decrypt(tenant\1.stripeSecretKey)', content)
    
    # SUMUP
    content = re.sub(r'tenant(\??)\.sumupClientSecret', r'decrypt(tenant\1.sumupClientSecret)', content)
    content = re.sub(r'tenant(\??)\.sumupAccessToken', r'decrypt(tenant\1.sumupAccessToken)', content)
    content = re.sub(r'tenant(\??)\.sumupRefreshToken', r'decrypt(tenant\1.sumupRefreshToken)', content)
    
    # DRIVER SUMUP
    content = re.sub(r'driver(\??)\.sumupAccessToken', r'decrypt(driver\1.sumupAccessToken)', content)
    content = re.sub(r'driver(\??)\.sumupRefreshToken', r'decrypt(driver\1.sumupRefreshToken)', content)
    
    # ZETTLE
    content = re.sub(r'tenant(\??)\.zettleClientSecret', r'decrypt(tenant\1.zettleClientSecret)', content)
    content = re.sub(r'tenant(\??)\.zettleAccessToken', r'decrypt(tenant\1.zettleAccessToken)', content)
    content = re.sub(r'tenant(\??)\.zettleRefreshToken', r'decrypt(tenant\1.zettleRefreshToken)', content)

    # WRITE ROUTES
    if 'integrations/sumup/callback' in fpath or 'integrations/zettle/callback' in fpath:
        content = re.sub(r'sumupAccessToken:\s*([a-zA-Z0-9_\.\(\)\[\]]+)', r'sumupAccessToken: encrypt(\1)', content)
        content = re.sub(r'sumupRefreshToken:\s*([a-zA-Z0-9_\.\(\)\[\]]+)', r'sumupRefreshToken: encrypt(\1)', content)
        content = re.sub(r'zettleAccessToken:\s*([a-zA-Z0-9_\.\(\)\[\]]+)', r'zettleAccessToken: encrypt(\1)', content)
        content = re.sub(r'zettleRefreshToken:\s*([a-zA-Z0-9_\.\(\)\[\]]+)', r'zettleRefreshToken: encrypt(\1)', content)
        
        # Prevent decrypting when assigning property names in prisma update payload
        content = content.replace('decrypt(tenant.sumupAccessToken):', 'sumupAccessToken:')

    with open(fpath, 'w') as f:
        f.write(content)

print("Patch applied to files.")
