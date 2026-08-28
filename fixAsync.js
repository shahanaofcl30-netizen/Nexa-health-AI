const fs = require('fs');
const path = require('path');

const routesDir = 'backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts')).map(f => path.join(routesDir, f));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/router\.post\('([^']+)', \(req/g, "router.post('$1', async (req");
  content = content.replace(/router\.put\('([^']+)', \(req/g, "router.put('$1', async (req");

  content = content.replace(/category: 'consultation'/g, "category: 'consultation' as any");
  content = content.replace(/severity: 'critical'/g, "severity: 'critical' as any");

  fs.writeFileSync(file, content);
});

console.log('Fixed async and typings');
