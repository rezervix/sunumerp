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
    
    // Exact string to find and replace with '}'
    const badString = `} else {\n        toast.error("Islem basarisiz. (Oturumunuz suresi dolmus olabilir, tekrar giris yapin)");\n      }`;
    
    let changed = false;
    while (content.includes(badString)) {
        content = content.replace(badString, '}');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Reverted ${file}`);
    }
});
