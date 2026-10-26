import type { APIRoute } from 'astro';
import { LANGS, url, type Lang } from '../../lib/i18n';
import { getPages, plainText, SECTIONS } from '../../lib/content';

export function getStaticPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}

/**
 * Full knowledge base for the future chatbot: one record per page with clean text,
 * short answers, FAQ, sources and the date facts were checked.
 */
export const GET: APIRoute = async ({ params, site }) => {
  const lang = params.lang as Lang;
  const pages = await getPages(lang);
  const records = pages.map(({ entry, slug, fallback }) => ({
    id: slug,
    lang: fallback ? 'ru' : lang,
    url: new URL(url(lang, `/guide/${slug}/`), site).toString(),
    title: entry.data.title,
    summary: entry.data.description,
    section: entry.data.section,
    sectionTitle: SECTIONS[entry.data.section].title[lang],
    audience: entry.data.audience,
    keyPoints: entry.data.tldr,
    faq: entry.data.faq,
    checked: entry.data.checked?.toISOString().slice(0, 10) ?? null,
    needsConfirmation: entry.data.needsConfirmation,
    sources: entry.data.sources,
    text: plainText(entry.body),
  }));
  return new Response(JSON.stringify({ version: 1, generated: new Date().toISOString(), records }, null, 1), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
