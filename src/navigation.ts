import { getPermalink } from './utils/permalinks';

export type Lang = 'ru' | 'uz';

interface District {
  slug: string;
  ru: string;
  uz: string;
}

// Официальные названия районов Ташкента на русском и узбекском (кириллица).
export const DISTRICTS: District[] = [
  { slug: 'chilanzar', ru: 'Чиланзар', uz: 'Чилонзор' },
  { slug: 'mirabad', ru: 'Мирабад', uz: 'Миробод' },
  { slug: 'shayxontohur', ru: 'Шайхантахур', uz: 'Шайхонтоҳур' },
  { slug: 'almazar', ru: 'Алмазар', uz: 'Олмазор' },
  { slug: 'uchtepa', ru: 'Учтепа', uz: 'Учтепа' },
  { slug: 'yunusabad', ru: 'Юнусабад', uz: 'Юнусобод' },
  { slug: 'yakkasaray', ru: 'Яккасарай', uz: 'Яккасарой' },
  { slug: 'mirzo-ulugbek', ru: 'Мирзо-Улугбек', uz: 'Мирзо Улуғбек' },
  { slug: 'yashnabad', ru: 'Яшнабад', uz: 'Яшнобод' },
  { slug: 'sergeli', ru: 'Сергели', uz: 'Сергели' },
  { slug: 'yangihayot', ru: 'Янгихаёт', uz: 'Янгиҳаёт' },
  { slug: 'bektemir', ru: 'Бектемир', uz: 'Бектемир' },
];

// Разделы, у которых уже есть узбекская версия. Остальные ссылки на uz-страницах
// временно ведут на русский оригинал, чтобы не давать 404 — по мере перевода
// каждого раздела добавляй его путь сюда.
const TRANSLATED_UZ_PATHS = new Set<string>([
  '/',
  '/rayony',
  '/pereezd',
  '/arenda',
  '/kontakty',
  ...DISTRICTS.map((d) => `/rayon/${d.slug}`),
]);

/** Есть ли у этого раздела уже переведённая узбекская страница (/uz/...). */
export const hasUzTranslation = (path: string): boolean => TRANSLATED_UZ_PATHS.has(path);

/**
 * Строит путь с учётом языка. Для uz: если раздел ещё не переведён —
 * временно возвращает путь на русскую версию (не /uz/...).
 */
export const withLangPrefix = (lang: Lang, path: string): string => {
  if (lang === 'uz' && hasUzTranslation(path)) {
    return getPermalink(`/uz${path}`);
  }
  return getPermalink(path);
};

/** Путь на главную с учётом языка. */
export const getHomeHref = (lang: Lang): string => withLangPrefix(lang, '/');

const districtLinks = (lang: Lang) =>
  DISTRICTS.map((d) => ({ text: d[lang], href: withLangPrefix(lang, `/rayon/${d.slug}`) }));

export function getHeaderData(lang: Lang = 'ru') {
  if (lang === 'uz') {
    return {
      links: [
        {
          text: 'Тошкент туманлари',
          links: [
            { text: 'Барча туманлар — умумий кўриниш', href: withLangPrefix('uz', '/rayony') },
            ...districtLinks('uz'),
          ],
        },
        { text: 'Кўчиш', href: withLangPrefix('uz', '/pereezd') },
        { text: 'Уй-жой ижараси', href: withLangPrefix('uz', '/arenda') },
        { text: 'Алоқа', href: withLangPrefix('uz', '/kontakty') },
      ],
      actions: [{ text: 'Туман танлаш', href: withLangPrefix('uz', '/rayony') }],
    };
  }

  return {
    links: [
      {
        text: 'Районы Ташкента',
        links: [{ text: 'Все районы — обзор', href: withLangPrefix('ru', '/rayony') }, ...districtLinks('ru')],
      },
      { text: 'Переезд', href: withLangPrefix('ru', '/pereezd') },
      { text: 'Аренда жилья', href: withLangPrefix('ru', '/arenda') },
      { text: 'Контакты', href: withLangPrefix('ru', '/kontakty') },
    ],
    actions: [{ text: 'Выбрать район', href: withLangPrefix('ru', '/rayony') }],
  };
}

export function getFooterData(lang: Lang = 'ru') {
  const links = districtLinks(lang);

  if (lang === 'uz') {
    return {
      links: [
        { title: 'Туманлар', links: links.slice(0, 6) },
        { title: 'Бошқа туманлар', links: links.slice(6) },
        {
          title: 'Йўриқномалар',
          links: [
            { text: 'Барча туманлар — умумий кўриниш', href: withLangPrefix('uz', '/rayony') },
            { text: 'Андижондан кўчиш', href: withLangPrefix('uz', '/pereezd') },
            { text: 'Уйни қандай ижарага олиш', href: withLangPrefix('uz', '/arenda') },
            { text: 'Алоқа ва йўл', href: withLangPrefix('uz', '/kontakty') },
          ],
        },
      ],
      secondaryLinks: [],
      socialLinks: [],
      footNote: `
    Андижондан Тошкентга кўчиб келувчилар учун қўлланма · Нарх ва маълумотлар 2026 йилга тегишли.
  `,
    };
  }

  return {
    links: [
      { title: 'Районы', links: links.slice(0, 6) },
      { title: 'Ещё районы', links: links.slice(6) },
      {
        title: 'Гайды',
        links: [
          { text: 'Все районы — обзор', href: withLangPrefix('ru', '/rayony') },
          { text: 'Переезд из Андижана', href: withLangPrefix('ru', '/pereezd') },
          { text: 'Как снять квартиру', href: withLangPrefix('ru', '/arenda') },
          { text: 'Контакты и как добраться', href: withLangPrefix('ru', '/kontakty') },
        ],
      },
    ],
    secondaryLinks: [],
    socialLinks: [],
    footNote: `
    Справочник для переезжающих из Андижана в Ташкент · Цены и данные актуальны на 2026 год.
  `,
  };
}

// Обратная совместимость для кода, ещё не учитывающего язык (например, неиспользуемый LandingLayout).
export const headerData = getHeaderData('ru');
export const footerData = getFooterData('ru');
