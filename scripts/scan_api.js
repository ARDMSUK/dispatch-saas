const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const report = [];

walkDir('src/app/api', (filePath) => {
    if (!filePath.endsWith('route.ts')) return;
    const content = fs.readFileSync(filePath, 'utf-8');

    let authYesNo = 'no';
    let tenantIdEnforced = 'no';
    let ownershipVerified = 'no';
    let trustsClientTenantId = 'no';
    let risk = 'high';
    let dataAccessed = 'various';
    
    // Check Auth
    if (content.includes('await auth()') || content.includes('getServerSession')) authYesNo = 'yes';
    
    // Check Tenant Enforcement
    if (content.includes('session.user.tenantId')) {
        tenantIdEnforced = 'yes';
        
        // Ownership verification (e.g. comparing fetched record's tenantId to session's tenantId)
        if (content.includes('.tenantId !== session.user.tenantId') || 
            content.includes('where: { tenantId: session.user.tenantId') ||
            content.match(/where:[\s\S]*?tenantId:\s*session\.user\.tenantId/)) {
            ownershipVerified = 'yes';
            risk = 'none';
        } else {
            risk = 'medium'; // Session tenantId is read but maybe not rigorously applied to where clause
        }
    }
    
    // Check Client Supply Spoofing Risk
    if (content.includes('req.json()') || content.includes('request.json()')) {
        if (content.match(/tenantId:\s*(body|data)\.tenantId/)) {
            trustsClientTenantId = 'yes';
            risk = 'critical';
        }
    }
    
    if (filePath.includes('stripe/webhook')) {
        risk = content.includes('tenantId') ? 'low' : 'high';
    }
    if (filePath.includes('booker/[slug]')) {
        authYesNo = 'no (public)';
        risk = content.includes('where: { slug }') ? 'low' : 'high'; 
    }
    
    report.push({
        route: filePath,
        auth: authYesNo,
        tenantIdEnforced,
        ownershipVerified,
        trustsClientTenantId,
        risk
    });
});

console.log(JSON.stringify(report, null, 2));
