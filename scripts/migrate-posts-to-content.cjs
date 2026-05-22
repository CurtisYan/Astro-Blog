const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'public', 'assets', '_posts');
const destDir = path.join(__dirname, '..', 'src', 'content', 'posts');

function scan(dir){
  const items = [];
  const files = fs.readdirSync(dir,{withFileTypes:true});
  for (const f of files){
    const full = path.join(dir,f.name);
    if (f.isDirectory()) items.push(...scan(full));
    else if (f.isFile() && path.extname(f.name).toLowerCase() === '.md') items.push(full);
  }
  return items;
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

ensureDir(destDir);
const files = scan(srcDir);
for (const f of files){
  const rel = path.relative(srcDir, f).replace(/\\/g,'/');
  const outPath = path.join(destDir, rel);
  ensureDir(path.dirname(outPath));
  const content = fs.readFileSync(f,'utf8');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Copied', rel);
}

console.log('Migration complete. Copied', files.length, 'files to src/content/posts');
