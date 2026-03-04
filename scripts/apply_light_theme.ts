import * as fs from 'fs';
import * as path from 'path';

// Mapping of dark mode classes to soft slate light mode classes
const classMap: Record<string, string> = {
    'bg-black/20': 'bg-slate-50',
    'bg-black/30': 'bg-slate-100',
    'bg-black/80': 'bg-slate-900/50', // Modal overlay
    'bg-black/95': 'bg-slate-100',
    'bg-zinc-900/80': 'bg-white/80',
    'bg-zinc-950/80': 'bg-white/80',
    'hover:text-white': 'hover:text-slate-900',
    'hover:bg-white/5': 'hover:bg-slate-200',
    'hover:bg-white/10': 'hover:bg-slate-200',
    'hover:bg-zinc-800': 'hover:bg-slate-200',
    'hover:bg-zinc-800/50': 'hover:bg-slate-200/50',
    'data-[state=active]:bg-zinc-800': 'data-[state=active]:bg-white shadow-sm border border-slate-200',
    'data-[state=active]:text-white': 'data-[state=active]:text-slate-900',
    'bg-black': 'bg-slate-50',
    'bg-zinc-950': 'bg-white',
    'bg-zinc-900/50': 'bg-slate-100',
    'bg-zinc-900': 'bg-slate-100',
    'bg-zinc-800': 'bg-slate-200',
    'bg-zinc-800/50': 'bg-slate-200',
    'bg-zinc-950/50': 'bg-white',
    'bg-black/40': 'bg-slate-100',
    'bg-black/50': 'bg-slate-100',
    'text-white': 'text-slate-900',
    'text-zinc-50': 'text-slate-900',
    'text-zinc-100': 'text-slate-900',
    'text-zinc-200': 'text-slate-800',
    'text-zinc-300': 'text-slate-700',
    'text-zinc-400': 'text-slate-500',
    'text-zinc-500': 'text-slate-400',
    'text-zinc-600': 'text-slate-500',
    'text-gray-400': 'text-slate-500',
    'border-white/10': 'border-slate-200',
    'border-white/5': 'border-slate-200',
    'border-zinc-800': 'border-slate-200',
    'border-zinc-700': 'border-slate-300',
    'text-indigo-400': 'text-indigo-600',
    'text-emerald-400': 'text-emerald-600',
    'text-blue-400': 'text-blue-600',
    'text-rose-400': 'text-rose-600',
    'bg-zinc-700': 'bg-slate-300',
    // Invert certain light classes that might have been used for contrast in dark mode
    'text-black': 'text-white',
    'bg-white': 'bg-slate-900', // Wait, replacing bg-white might break components that actually needed white. I'll skip inverting light->dark for now unless necessary.
};

// Create a safe mapping by removing the unsafe ones from the generic map
delete classMap['text-black'];
delete classMap['bg-white'];

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

            // Simple replaceAll for each class class in the map
            // Note: We use regex with word boundaries \b to avoid partial matches
            // However, classes like `bg-zinc-900/50` have slashes which aren't standard word boundaries.

            for (const [darkClass, lightClass] of Object.entries(classMap)) {
                // Escape special characters in the key for regex
                const escapedDarkClass = darkClass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

                // Using a regex carefully: we want to match the exact class name
                // It should be preceded by a quote, space, or backtick, and followed by a quote, space, backtick, or string end
                const regex = new RegExp(`(?<=['"\`\\s])${escapedDarkClass}(?=['"\`\\s])`, 'g');
                content = content.replace(regex, lightClass);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

const srcPath = path.join(__dirname, '../src');
processDirectory(srcPath);
console.log("Global theme swap completed.");
