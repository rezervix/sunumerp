const fs = require('fs');
const path = require('path');

const targetDirs = [
    'app/dashboard/orders/page.tsx',
    'app/dashboard/b2b/page.tsx',
    'app/dashboard/crm/page.tsx',
    'app/dashboard/projects/page.tsx',
    'app/dashboard/leads/page.tsx',
    'app/dashboard/cargo/page.tsx',
    'app/dashboard/files/page.tsx',
    'app/dashboard/todos/page.tsx',
    'app/dashboard/notes/page.tsx',
    'app/dashboard/finance/FinanceClient.tsx',
    'app/dashboard/financial/page.tsx'
];

targetDirs.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // Fix imports if 'toast' is missing
    if (!content.includes('import { toast }') && !content.includes('import {toast}')) {
        content = content.replace(/import \{.*\} from "react"/g, '$&\nimport { toast } from "sonner"');
        changed = true;
    }

    // Replace if (res.ok) { ... } with if (res.ok) { ... } else { toast.error("Islem basarisiz oldu. Lutfen sayfayi yenileyin veya tekrar giris yapin.") }
    
    const regexCreate = /if \(res\.ok\) \{([^}]+)\}/g;
    
    content = content.replace(regexCreate, (match, p1) => {
        // If it already has an 'else', skip
        const nextChars = content.substring(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 10);
        if (nextChars.includes('else')) {
            return match;
        }

        changed = true;
        return `if (res.ok) {${p1}} else {\n        toast.error("Islem basarisiz. (Oturumunuz suresi dolmus olabilir, tekrar giris yapin)");\n      }`;
    });

    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
    }
});
