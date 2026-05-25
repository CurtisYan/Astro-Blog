const fs = require('fs');
const path = require('path');
const {marked} = require('marked');

const siteConfigPath = path.join(__dirname, '..', 'public', 'assets', 'site-config.json');

function loadSiteConfig() {
  try {
    return JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
  } catch (error) {
    return {};
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text){
  return text.toString().toLowerCase().trim()
    .replace(/^\d+\-/,'')
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
      // handle simple YAML array like [a, b]
      if (val.startsWith('[') && val.endsWith(']')){
        const arr = val.slice(1,-1).split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
        out[key] = arr;
      } else {
        if (val === 'false') val = false;
        if (val === 'true') val = true;
        out[key] = String(val).replace(/^\s+|\s+$/g,'');
      }
    }
  });
  return out;
}

function stripHtml(html){
  return html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
}

function firstParagraphFromMarkdown(md){
  if (!md) return '';
  const after = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
  const paras = after.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  if (paras.length) return paras[0].replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1').replace(/^>\s?/, '').replace(/^#+\s*/, '');
  return '';
}

function decodeHtmlEntities(str){
  return String(str).replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
      if (ext === '.md') items.push(full);
    }
  }
  return items;
}

const siteConfig = loadSiteConfig();
const siteTitle = siteConfig.headerTitle || siteConfig.siteTitle || 'Blog';
const siteTagline = siteConfig.tagline || 'A clean and lightweight static blog';
const footerTextHtml = siteConfig.footerTextHtml || `© <span data-year></span>`;
const footerCreditHtml = siteConfig.footerCreditHtml || '';
const postsDir = path.join(__dirname,'..','public','assets','_posts');
const outPostsDir = path.join(__dirname,'..','public','posts');
const outJson = path.join(__dirname,'..','public','assets','posts.json');

if (!fs.existsSync(postsDir)){
  console.error('posts directory not found:', postsDir);
  process.exit(1);
}

const mdFiles = scan(postsDir);
const posts = [];

for (const f of mdFiles){
  const rel = path.relative(postsDir, f).replace(/\\/g,'/');
  const filename = path.basename(f);
  const ext = path.extname(filename);
  const basename = filename.replace(ext,'');
  const content = readFileSafe(f);
  const fm = parseFrontmatter(content);
  const title = fm.title || (content.match(/^#\s+(.+)$/m) || [])[1] || basename;
  const date = normalizeDate(fm.date) || (basename.match(/(\d{4}-\d{2}-\d{2})/)||[])[1] || new Date().toISOString().slice(0,10);
  const tags = fm.tags ? (Array.isArray(fm.tags) ? fm.tags : String(fm.tags).split(/[,\s]+/).filter(Boolean)) : [];
  const excerptRaw = (fm.excerpt && fm.excerpt !== 'false') ? fm.excerpt : firstParagraphFromMarkdown(content);
  let excerpt = stripHtml(marked.parseInline(String(excerptRaw || '')).toString());
  if (!excerpt) excerpt = stripHtml(marked.parseInline(firstParagraphFromMarkdown(content)).toString());
  excerpt = decodeHtmlEntities(excerpt).slice(0,200);
  const section = rel.indexOf('daily') >= 0 ? 'life' : 'tech';
  const slug = slugify(basename);
  const tagLinks = (tags || []).map((tag) => `<a href="/tags/${slugify(tag)}.html">${tag}</a>`).join(', ');

  // render HTML
  const mdBody = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
  const htmlBody = marked.parse(mdBody);

  // build page
  const pageHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${escapeHtml(siteTitle)}</title>
  <link rel="stylesheet" href="/assets/site.css">
  </head>
<body>
  <div class="site-shell">
    <header class="site-header stack">
      <div class="nav-shell">
        <button class="nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="primary-nav">菜单</button>
        <nav class="nav" id="primary-nav" data-primary-nav aria-label="Primary">
          <a href="/life.html">生活</a>
          <a href="/tech.html">技术</a>
          <a href="/about/">关于</a>
        </nav>
      </div>
      <div class="brand">
        <h1><a href="/">${escapeHtml(siteTitle)}</a></h1>
        <p>${escapeHtml(siteTagline)}</p>
      </div>
      <div class="separator-wrap">
        <hr class="davis-separator">
      </div>
    </header>
    <main class="article">
      <h1>${title}</h1>
      ${htmlBody}
      <p class="post-meta">${date}</p>
      ${tagLinks ? `<p class="post-taxonomy">${tagLinks}</p>` : ''}
    </main>
    <footer class="site-footer stack">
      <div class="separator-wrap">
        <hr class="davis-separator">
      </div>
      <p>${footerTextHtml}</p>
      ${footerCreditHtml ? `<p class="credits">${footerCreditHtml}</p>` : ''}
    </footer>
  </div>
  <script src="/assets/site.js" defer></script>
</body>
</html>`;

  const outFile = path.join(outPostsDir, slug + '.html');
  fs.writeFileSync(outFile, pageHtml,'utf8');

  posts.push({ slug, title, date, excerpt, section, tags });
  console.log('Wrote post:', outFile);
}

// merge with any existing non-md posts (html files) by preserving existing posts with same slug
const existing = (()=>{
  try{ return JSON.parse(fs.readFileSync(outJson,'utf8')); }catch(e){ return []; }
})();
const merged = posts.slice();
for (const e of existing){
  if (!merged.find(p=>p.slug===e.slug)) merged.push(e);
}

fs.writeFileSync(outJson, JSON.stringify(merged,null,2),'utf8');
console.log('Updated posts.json with', merged.length, 'entries');
