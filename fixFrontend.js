const fs = require('fs');
const glob = null;
const path = require('path');

const dir = 'frontend/src';

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(dir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix firstName[0]
    if (content.includes('firstName[0]')) {
        content = content.replace(/firstName\[0\]/g, "firstName?.[0]");
        changed = true;
    }
    // Fix lastName[0]
    if (content.includes('lastName[0]')) {
        content = content.replace(/lastName\[0\]/g, "lastName?.[0]");
        changed = true;
    }
    // Fix specific cases in Navbar.tsx
    if (filePath.includes('Navbar.tsx')) {
        if (content.includes('currentUser?.firstName[0]')) {
             content = content.replace(/currentUser\?\.firstName\[0\]/g, "currentUser?.firstName?.[0]");
             changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    }
});

console.log('Done fixing frontend strings');
