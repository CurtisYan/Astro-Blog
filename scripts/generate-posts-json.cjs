const fs = require('fs');
const path = require('path');

function slugify(text){
  return text.toString().toLowerCase().trim()
    .replace(/^[0-9\-_.]+/, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g,'-')
    .replace(/(^-|-$)/g,'');
}

function readFileSafe(p){
  try { return fs.readFileSync(p,'utf8'); } catch(e){ return null; }
}

function parseFrontmatter(md){
  if (!md) return {};
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return {};
  const yaml = m[1];
  const out = {};
  yaml.split(/\n+/).forEach(line=>{
    const i = line.indexOf(':');
    if (i>0){
      const key = line.slice(0,i).trim();
      let val = line.slice(i+1).trim();
      if (val === 'false') val = false;
      if (val === 'true') val = true;
      if (/^\[.*\]$/.test(val)){
        try{ val = JSON.parse(val.replace(/([A-Za-z0-9_-]+)\s*:/g,'"$1":').replace(/'/g,'"')); }catch(e){}
      }
      out[key]=val;
    }
  });
  return out;
}

function extractTitle(md, filename){
  if (!md) return filename;
  const fm = parseFrontmatter(md);
  if (fm.title) return fm.title;
  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return filename;
}

function extractExcerpt(md){
  if (!md) return '';
  const after = md.replace(/^---[\s\S]*?---\n/,'');
  const paras = after.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  if (paras.length) return paras[0].replace(/\n/g,' ').slice(0,200);
  return '';
}

function inferDateFromName(name){
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return null;
}

function normalizeDate(value){
  if (!value) return null;
  const text = String(value).replace(' ', 'T');
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10);
}

function scan(dir){
  const items = [];
  const files = fs.readdirSync(dir,{withFileTypes:true});
  for (const f of files){
    const full = path.join(dir,f.name);
    if (f.isDirectory()){
      items.push(...scan(full));
    } else if (f.isFile()){
      const ext = path.extname(f.name).toLowerCase();
      if (ext === '.md' || ext === '.html'){
        items.push(full);
      }
    }
  }
  return items;
}

const postsDir = path.join(__dirname,'..','public','assets','_posts');
const outFile = path.join(__dirname,'..','public','assets','posts.json');

const files = scan(postsDir);
const posts = [];
const mdSlugs = new Set();

for (const f of files){
  const ext = path.extname(f).toLowerCase();
  if (ext !== '.md') continue;
  const basename = path.basename(f, ext);
  mdSlugs.add(slugify(basename));
}

for (const f of files){
  const rel = path.relative(postsDir, f).replace(/\\/g,'/');
  const parts = rel.split('/');
  const filename = parts.pop();
  const parent = parts[0] || '';
  const ext = path.extname(filename).toLowerCase();
  const basename = filename.replace(ext,'');
  const slug = slugify(basename);

  // Prefer markdown sources when both md/html exist for the same slug
  if (ext === '.html' && mdSlugs.has(slug)) {
    continue;
  }

  const content = readFileSafe(f);
  const fm = parseFrontmatter(content);
  const title = extractTitle(content, basename);
  const excerpt = extractExcerpt(content) || (fm.excerpt===false ? '' : (fm.excerpt||''));
  const dateFromName = inferDateFromName(basename) || inferDateFromName(rel);
  const stats = fs.statSync(f);
  const fmDate = normalizeDate(fm.date);
  const date = fmDate || dateFromName || new Date(stats.mtime).toISOString().slice(0,10);
  let section = 'tech';
  if (parent === 'daily' || rel.startsWith('daily/') || rel.includes('/daily/')) section = 'life';
  // slug: remove date prefix and non-word chars
  
  let tags = [];
  if (fm.tags){
    if (Array.isArray(fm.tags)) tags = fm.tags;
    else if (typeof fm.tags === 'string') tags = fm.tags.split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
  }

  posts.push({ slug, title, date, excerpt, section, tags, source: parent || 'root' });
}

// sort by date desc
posts.sort((a,b)=> new Date(b.date) - new Date(a.date));

fs.writeFileSync(outFile, JSON.stringify(posts,null,2),'utf8');
console.log('Wrote', posts.length, 'posts to', outFile);
