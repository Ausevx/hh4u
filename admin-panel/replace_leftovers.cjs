const fs = require('fs');
const path = require('path');

const directory = 'src';

const regexReplacements = [
    { pattern: /hover:text-\[\#0F2027\]/g, replacement: 'hover:text-black dark:hover:text-white' },
    { pattern: /hover:bg-slate-100/g, replacement: 'hover:bg-gray-100 dark:hover:bg-gray-800' },
    { pattern: /text-\[\#A14A2A\]\/90/g, replacement: 'text-black/90 dark:text-white/90' },
    { pattern: /border-\[\#0E7C86\]/g, replacement: 'border-black dark:border-white' },
    { pattern: /bg-\[\#EAF5F6\]\/40/g, replacement: 'bg-gray-100/40 dark:bg-gray-900/40' },
    { pattern: /hover:border-\[\#0E7C86\]\/50/g, replacement: 'hover:border-black/50 dark:hover:border-white/50' },
    { pattern: /bg-slate-50\/50/g, replacement: 'bg-gray-50/50 dark:bg-gray-900/50' },
    { pattern: /bg-rose-600/g, replacement: 'bg-black dark:bg-white text-white dark:text-black' },
    { pattern: /hover:bg-rose-700/g, replacement: 'hover:bg-gray-800 dark:hover:bg-gray-200' },
    { pattern: /text-rose-500/g, replacement: 'text-black dark:text-white' },
];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir(directory, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        for (const rep of regexReplacements) {
            content = content.replace(rep.pattern, rep.replacement);
        }

        fs.writeFileSync(filePath, content);
    }
});
