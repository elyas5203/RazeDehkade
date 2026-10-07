const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            if (fullPath.match(/\.(html|js|css|md)$/)) {
                results.push(fullPath);
            }
        }
    });
    return results;
};

const files = walk(__dirname);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.match(/SYSTEM/i)) {
        console.log('Replacing in', file);
        content = content.replace(/SYSTEM/g, 'SYSTEM');
        content = content.replace(/system/g, 'system');
        content = content.replace(/System/g, 'System');
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('Done');
