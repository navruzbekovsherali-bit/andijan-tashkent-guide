import type { APIRoute } from 'astro';
import { LANGS, url, type Lang } from '../lib/i18n';
import { getPages, plainText, SECTIONS } from '../lib/content';

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

/** Compact index for in-browser search. */
export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Lang;
  const pages = await getPages(lang);
  const docs = pages.map(({ entry, slug }) => ({
    slug,
    url: url(lang, `/guide/${slug}/`),
    title: entry.data.title,
    description: entry.data.description,
    section: SECTIONS[entry.data.section].title[lang],
    audience: entry.data.audience,
    text: plainText(entry.body).slice(0, 4000),
    faq: entry.data.faq,
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
