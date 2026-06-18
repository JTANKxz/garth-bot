const fs = require('fs');
const path = require('path');

const files = [
  "src/commands/owner/ia.js",
  "src/commands/public/bin.js",
  "src/commands/public/brasileirao.js",
  "src/commands/public/cep.js",
  "src/commands/public/cnpj.js",
  "src/commands/public/ddd.js",
  "src/commands/public/demitir.js",
  "src/commands/public/emprego.js",
  "src/commands/public/ip.js"
];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', file);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove isGroupVip import
  content = content.replace(/,\s*isGroupVip/g, '');
  content = content.replace(/isGroupVip,\s*/g, '');
  content = content.replace(/\{\s*isGroupVip\s*\}/g, '{}');
  content = content.replace(/import\s*\{\s*\}\s*from\s*"[^"]+groups\.js";\n?/g, '');

  // Remove vipOnly: true,
  content = content.replace(/\s*vipOnly:\s*true,/g, '');

  // Remove const groupVip = ...
  content = content.replace(/\s*const\s+groupVip\s*=\s*.*?;/g, '');

  // Remove the if block for VIP
  content = content.replace(/\s*(?:\/\/[^\n]*VIP[^\n]*\n)?\s*if\s*\((?:isGroup\s*&&\s*)?!groupVip\s*&&\s*!isCreator\)\s*\{\s*return\s+sock\.sendMessage\([\s\S]*?\}\s*\);?\s*\}/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed', file);
}
