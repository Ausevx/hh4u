const fs = require('fs');
const path = require('path');

const directory = 'src';

const exactReplacements = {
    // Backgrounds
    'bg-[#F7F9FB]': 'bg-white dark:bg-black',
    'bg-[#0E7C86]': 'bg-black dark:bg-white',
    'bg-[#EAF5F6]': 'bg-gray-100 dark:bg-gray-900',
    'bg-[#FFF0EC]': 'bg-gray-100 dark:bg-gray-900',
    'bg-emerald-50': 'bg-gray-100 dark:bg-gray-900',
    'bg-emerald-50/50': 'bg-gray-50 dark:bg-gray-900',
    'bg-emerald-100': 'bg-gray-200 dark:bg-gray-800',
    'bg-emerald-500': 'bg-black dark:bg-white',
    'bg-blue-50': 'bg-gray-100 dark:bg-gray-900',
    'bg-purple-50': 'bg-gray-100 dark:bg-gray-900',
    'bg-amber-500': 'bg-gray-500 dark:bg-gray-400',
    'bg-slate-50': 'bg-gray-50 dark:bg-gray-900',
    'bg-slate-100': 'bg-gray-100 dark:bg-gray-800',
    'bg-slate-50/75': 'bg-gray-50/75 dark:bg-gray-900/75',
    'bg-white': 'bg-white dark:bg-black',
    'bg-rose-50': 'bg-gray-100 dark:bg-gray-900',
    'bg-[#F7F9FB]/40': 'bg-gray-50/40 dark:bg-black/40',
    'bg-[#F7F9FB]/80': 'bg-gray-50/80 dark:bg-black/80',
    
    // Text colors
    'text-[#0F2027]': 'text-black dark:text-white',
    'text-[#5C7480]': 'text-gray-600 dark:text-gray-400',
    'text-[#0E7C86]': 'text-black dark:text-white',
    'text-[#A14A2A]': 'text-black dark:text-white',
    'text-white': 'text-white dark:text-black',
    'text-emerald-700': 'text-black dark:text-white',
    'text-emerald-600': 'text-gray-800 dark:text-gray-200',
    'text-blue-600': 'text-black dark:text-white',
    'text-purple-600': 'text-black dark:text-white',
    'text-slate-600': 'text-gray-600 dark:text-gray-400',
    'text-slate-500': 'text-gray-500 dark:text-gray-400',
    'text-slate-400': 'text-gray-400 dark:text-gray-500',
    'text-slate-300': 'text-gray-300 dark:text-gray-600',
    'text-rose-600': 'text-black dark:text-white',
    
    // Borders
    'border-slate-100': 'border-gray-200 dark:border-gray-800',
    'border-slate-200': 'border-gray-200 dark:border-gray-800',
    'border-slate-200/80': 'border-gray-200/80 dark:border-gray-800/80',
    'border-slate-200/70': 'border-gray-200/70 dark:border-gray-800/70',
    'border-slate-200/60': 'border-gray-200/60 dark:border-gray-800/60',
    'border-emerald-100': 'border-gray-200 dark:border-gray-800',
    'border-rose-200': 'border-gray-200 dark:border-gray-800',
    
    // Hovers
    'hover:bg-[#0A5C63]': 'hover:bg-gray-800 dark:hover:bg-gray-200',
    'hover:bg-[#d8edef]': 'hover:bg-gray-200 dark:hover:bg-gray-800',
    'hover:bg-[#EAF5F6]': 'hover:bg-gray-100 dark:hover:bg-gray-900',
    'hover:bg-emerald-100': 'hover:bg-gray-200 dark:hover:bg-gray-800',
    'hover:bg-slate-50': 'hover:bg-gray-100 dark:hover:bg-gray-900',
    'hover:bg-rose-50': 'hover:bg-gray-100 dark:hover:bg-gray-900',
    'hover:bg-[#F7F9FB]': 'hover:bg-gray-50 dark:hover:bg-gray-900',
    'hover:text-[#0E7C86]': 'hover:text-gray-800 dark:hover:text-gray-200',
    'hover:text-rose-600': 'hover:text-gray-800 dark:hover:text-gray-200',
    'hover:text-slate-600': 'hover:text-gray-600 dark:hover:text-gray-300',
    
    // Shadows & Rings
    'shadow-teal-900/10': 'shadow-black/10 dark:shadow-white/10',
    'focus:ring-[#0E7C86]': 'focus:ring-black dark:focus:ring-white',
    'focus:border-[#0E7C86]': 'focus:border-black dark:focus:border-white',
    'ring-[#0E7C86]': 'ring-black dark:ring-white',
};

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

function processClasses(classesStr) {
    // Split by spaces, newlines, or quotes, then replace
    // Better: use regex to match non-whitespace sequences and replace them if they are in the dictionary
    return classesStr.replace(/[^\s"'`{}]+/g, (match) => {
        return exactReplacements[match] || match;
    });
}

walkDir(directory, (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // This regex matches `className="something"` or `className={'something'}` or `className={`something`}`
        // and we pass the internal string to `processClasses`.
        // However, a simpler approach is just to run the word replacement on the entire file content,
        // because we're just mapping css classes.
        
        // So we just replace all words in the whole file
        content = content.replace(/[^\s"'`{}]+/g, (match) => {
            return exactReplacements[match] || match;
        });

        fs.writeFileSync(filePath, content);
    }
});
