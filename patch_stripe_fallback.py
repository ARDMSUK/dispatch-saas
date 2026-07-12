import os
import glob

files_to_patch = [
    "src/app/api/jobs/[id]/payment/sms/route.ts",
    "src/app/api/jobs/[id]/payment/email/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/sms/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment/email/route.ts",
    "src/app/api/mobile/driver/jobs/[id]/payment-link/route.ts"
]

target_pattern = """                } else {
                    console.warn(`Invalid Stripe key format for tenant ${tenant.id}. Falling back to system Stripe.`);
                }
            }

            const stripeClient = validTenantKey ? getStripe(validTenantKey) : systemStripe;

            if (!stripeClient) {
                return NextResponse.json({ error: 'Stripe is not configured or unavailable' }, { status: 500 });
            }"""

replacement_pattern = """                } else {
                    console.warn(`Invalid Stripe key format for tenant ${tenant.id}.`);
                }
            }

            const stripeClient = validTenantKey ? getStripe(validTenantKey) : null;

            if (!stripeClient) {
                return NextResponse.json({ error: 'Card payments are not configured for this operator.' }, { status: 400 });
            }"""

target_pattern2 = """            } else {
                console.warn(`Invalid Stripe key format for tenant ${tenant.id}. Falling back to system Stripe.`);
            }
        }

        const stripeClient = validTenantKey ? getStripe(validTenantKey) : systemStripe;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Stripe is not configured or unavailable' }, { status: 500 });
        }"""

replacement_pattern2 = """            } else {
                console.warn(`Invalid Stripe key format for tenant ${tenant.id}.`);
            }
        }

        const stripeClient = validTenantKey ? getStripe(validTenantKey) : null;

        if (!stripeClient) {
            return NextResponse.json({ error: 'Card payments are not configured for this operator.' }, { status: 400 });
        }"""


for filepath in files_to_patch:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        new_content = content.replace(target_pattern, replacement_pattern).replace(target_pattern2, replacement_pattern2)
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Patched {filepath}")
    else:
        print(f"Not found: {filepath}")

