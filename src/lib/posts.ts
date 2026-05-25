import { getCollection } from 'astro:content';
import { siteConfig, type SiteSection } from '../config/site';

const sectionByDir = Object.fromEntries(
  Object.entries(siteConfig.sections).flatMap(([section, config]) =>
    config.dirs.map((dir) => [dir, section])
  )
) as Record<string, SiteSection>;

function pad(value: string | number) {
  return String(value).padStart(2, '0');
}

function parseDateFromString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateFromId(id: string) {
  const match = id.match(/(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})/);
  if (!match) return null;
  return new Date(`${match[1]}-${pad(match[2])}-${pad(match[3])}T12:00:00`);
}

export function getPostId(post: { id?: string; slug?: string }) {
  return String(post.slug || post.id || '').trim();
}

export function getPostDate(post: { id?: string; data?: { date?: string | Date } }) {
  const rawDate = post.data?.date;
  if (rawDate instanceof Date) {
    return Number.isNaN(rawDate.getTime()) ? null : rawDate;
  }
  if (typeof rawDate === 'string' && rawDate.trim()) {
    const parsed = parseDateFromString(rawDate.trim());
    if (parsed) return parsed;
  }

  const postId = getPostId(post);
  if (postId) {
    return parseDateFromId(postId);
  }

  return null;
}

export function formatMonthDay(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });
}

export function formatYear(date: Date | null) {
  if (!date) return 'Unknown';
  return String(date.getFullYear());
}

export function getPostSection(post: { id?: string; slug?: string }) {
  const id = getPostId(post);
  const topLevel = id.split('/')[0];
  return sectionByDir[topLevel] || 'tech';
}

export function getPostHref(post: { id?: string; slug?: string }) {
  const id = getPostId(post);
  return id ? `/posts/${id}/` : '/posts/';
}

export function slugifyTag(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\\/]+/g, '-');
}

export function normalizeTags(value: unknown) {
  if (!value) return [];

  const values = Array.isArray(value)
    ? value
    : String(value)
        .split(/[,;，；]/)
        .flatMap((item) => {
          const trimmed = item.trim();
          if (/^[\w-]+ [\w-]+$/i.test(trimmed)) {
            return trimmed.split(/\s+/);
          }
          return [trimmed];
        });

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of values) {
    const tag = String(item || '').trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function getPostTags(post: { data?: { tags?: unknown } }) {
  return normalizeTags(post.data?.tags);
}

export function getTagHref(tag: string) {
  return `/tags/${slugifyTag(tag)}/`;
}

export function getAllTags(posts: Array<{ data?: { tags?: unknown } }>) {
  const tagMap = new Map<string, { name: string; slug: string; count: number }>();

  for (const post of posts) {
    for (const tag of getPostTags(post)) {
      const slug = slugifyTag(tag);
      const existing = tagMap.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(slug, { name: tag, slug, count: 1 });
      }
    }
  }

  return Array.from(tagMap.values()).sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-CN')
  );
}

export async function loadPosts() {
  const posts = await getCollection('posts');
  return posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      ...post,
      _date: getPostDate(post)
    }))
    .sort((left, right) => {
      const leftTime = left._date ? left._date.getTime() : 0;
      const rightTime = right._date ? right._date.getTime() : 0;
      return rightTime - leftTime;
    });
}

export function groupPostsByYear(posts: Array<{ _date: Date | null }>) {
  const groups = new Map<string, typeof posts>();

  for (const post of posts) {
    const year = formatYear(post._date);
    const existing = groups.get(year) || [];
    existing.push(post);
    groups.set(year, existing);
  }

  const numericYears = Array.from(groups.keys())
    .filter((year) => year !== 'Unknown')
    .map((year) => Number(year))
    .filter((year) => !Number.isNaN(year))
    .sort((a, b) => b - a)
    .map(String);

  if (groups.has('Unknown')) {
    numericYears.push('Unknown');
  }

  return numericYears.map((year) => ({ year, posts: groups.get(year) || [] }));
}

export function filterPostsBySection(posts: Array<{ id?: string; slug?: string; data?: { section?: string } }>, section: SiteSection) {
  return posts.filter((post) => getPostSection(post) === section);
}
