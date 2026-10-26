import { LANGS, DEFAULT_LANG, type Lang } from './i18n';

/** Static paths for the optional language segment: Russian at the root. */
export function langPaths() {
  return LANGS.map((lang: Lang) => ({ params: { lang: lang === DEFAULT_LANG ? undefined : lang }, props: { lang } }));
}
