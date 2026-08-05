const fs = require('fs');
const path = require('path');

function searchInDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchInDir(fullPath, query);
            }
        } else {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.toLowerCase().includes(query)) {
                    console.log(`Found in: ${fullPath}`);
                }
            }
        }
    }
}
searchInDir(__dirname, 'password');
