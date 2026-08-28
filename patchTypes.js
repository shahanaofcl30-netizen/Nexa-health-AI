const fs = require('fs');

const files = [
  'backend/src/types/shared.ts',
  'frontend/src/types/shared.ts'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('patientName?: string;')) {
      content = content.replace(
        "patientId: string;",
        "patientId: string;\n  patientName?: string;"
      );
      fs.writeFileSync(file, content);
      console.log(\`Patched \${file}\`);
    }
  }
});
