import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type Audience = 'local' | 'expat';
export type GuideEntry = CollectionEntry<'guide'>;

export type SectionId = GuideEntry['data']['section'];

/** Sections in the order a newcomer lives through them. `line` is the route colour token. */
export const SECTIONS: Record<SectionId, { title: Record<Lang, string>; icon: string; line: number }> = {
  start: { title: { ru: 'Начало', en: 'Start', uz: 'Boshlanish' }, icon: 'flag', line: 1 },
  arrival: { title: { ru: 'Переезд и прибытие', en: 'Moving and arrival', uz: 'Koʻchish va kelish' }, icon: 'plane', line: 2 },
  'first-days': { title: { ru: 'Первые дни в банке', en: 'First days at the bank', uz: 'Bankdagi ilk kunlar' }, icon: 'door', line: 3 },
  work: { title: { ru: 'Работа и деньги', en: 'Work and money', uz: 'Ish va pul' }, icon: 'wallet', line: 4 },
  living: { title: { ru: 'Жизнь в Узбекистане', en: 'Living in Uzbekistan', uz: 'Oʻzbekistonda hayot' }, icon: 'home', line: 5 },
  family: { title: { ru: 'Семья и дети', en: 'Family and children', uz: 'Oila va bolalar' }, icon: 'family', line: 6 },
  country: { title: { ru: 'Об Узбекистане', en: 'About Uzbekistan', uz: 'Oʻzbekiston haqida' }, icon: 'globe', line: 1 },
  travel: { title: { ru: 'Отдых и поездки', en: 'Leisure and trips', uz: 'Dam olish va sayohat' }, icon: 'mountain', line: 2 },
  help: { title: { ru: 'Помощь и контакты', en: 'Help and contacts', uz: 'Yordam va kontaktlar' }, icon: 'phone', line: 4 },
};

/** Animated illustration for each topic (src/components/illus/). */
export type IllusName = 'plane' | 'car' | 'card' | 'money' | 'house' | 'docs' | 'family' | 'mountains' | 'phone' | 'map';
const SECTION_ILLUS: Record<SectionId, IllusName> = {
  start: 'docs',
  arrival: 'plane',
  'first-days': 'docs',
  work: 'money',
  living: 'house',
  family: 'family',
  country: 'map',
  travel: 'mountains',
  help: 'phone',
};
// Pages whose subject has its own picture: the car page gets the car, the card page the card.
const PAGE_ILLUS: Record<string, IllusName> = {
  'car-import': 'car',
  transport: 'car',
  'bank-card': 'card',
  apps: 'phone',
  'relocation-budget': 'money',
  'salary-local': 'money',
  'salary-expat': 'money',
  limits: 'card',
  'business-trips': 'plane',
  packing: 'plane',
  tashkent: 'map',
  andijan: 'map',
};
export const illusOf = (id: SectionId, slug?: string): IllusName => (slug && PAGE_ILLUS[slug]) || SECTION_ILLUS[id];

export const SECTION_ORDER = Object.keys(SECTIONS) as SectionId[];

/** Slug of an entry without the language folder. */
export function slugOf(entry: GuideEntry): string {
  return entry.id.split('/').slice(1).join('/');
}

export function langOf(entry: GuideEntry): string {
  return entry.id.split('/')[0];
}

function sortEntries(a: GuideEntry, b: GuideEntry) {
  const s = SECTION_ORDER.indexOf(a.data.section) - SECTION_ORDER.indexOf(b.data.section);
  return s !== 0 ? s : a.data.order - b.data.order;
}

/**
 * All pages for a language. Pages that are not translated yet fall back to Russian,
 * flagged with `fallback: true` so the page can say so.
 */
export async function getPages(lang: Lang): Promise<{ entry: GuideEntry; slug: string; fallback: boolean }[]> {
  const all = await getCollection('guide');
  const ru = all.filter((e) => langOf(e) === 'ru');
  const own = new Map(all.filter((e) => langOf(e) === lang).map((e) => [slugOf(e), e]));
  return ru
    .map((base) => {
      const slug = slugOf(base);
      const translated = own.get(slug);
      return { entry: translated ?? base, slug, fallback: lang !== 'ru' && !translated };
    })
    .sort((a, b) => sortEntries(a.entry, b.entry));
}

export function forAudience<T extends { entry: GuideEntry }>(pages: T[], audience: Audience): T[] {
  return pages.filter((p) => p.entry.data.audience.includes(audience));
}

export function groupBySection<T extends { entry: GuideEntry }>(pages: T[]) {
  return SECTION_ORDER.map((id) => ({ id, pages: pages.filter((p) => p.entry.data.section === id) })).filter(
    (g) => g.pages.length > 0,
  );
}

/** Rough reading time for Russian text. */
export function readingMinutes(body = ''): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 170));
}

/** Plain text from markdown for search and the future chatbot. */
export function plainText(md = ''): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
