import * as fs from 'fs';
import * as path from 'path';

// Mapping of amber to blue
const classMap: Record<string, string> = {
    'amber-400': 'blue-600',
    'amber-500': 'blue-700',
    'amber-600': 'blue-800',
    // also specific ones if they have opacity but the generic replacement should handle them
};

function processDirectory(dir: string): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let originalContent = content;

            // Use regex to replace amber-XXX with blue-YYY
            content = content.replace(/amber-400/g, 'blue-600');
            content = content.replace(/amber-500/g, 'blue-700');
            content = content.replace(/amber-600/g, 'blue-800');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

const srcPath = path.join(__dirname, '../src');
processDirectory(srcPath);
console.log("Accent color swap from Amber to Blue completed.");
