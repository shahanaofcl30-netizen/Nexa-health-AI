const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'frontend/src/hooks');

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the import statement for supabase
  content = content.replace(/import\s*\{\s*supabase,\s*isSupabaseConfigured\s*\}\s*from\s*'[^']+';\n?/g, '');

  while (true) {
    const startIndex = content.indexOf('if (isSupabaseConfigured && supabase) {');
    if (startIndex === -1) break;

    let openBraces = 0;
    let endIndex = -1;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') openBraces++;
      if (content[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      content = content.substring(0, startIndex) + content.substring(endIndex + 1);
    } else {
      break;
    }
  }

  // Remove any trailing empty lines left over
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Cleaned ${filePath}`);
}

const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.ts'));
for (const file of files) {
  cleanFile(path.join(hooksDir, file));
}
