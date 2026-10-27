export const LANGS = ['ru', 'en', 'uz'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ru';

export const LANG_LABEL: Record<Lang, string> = { ru: 'Рус', en: 'Eng', uz: 'Oʻzb' };

/** URL prefix for a language: Russian lives at the root. */
export function langPrefix(lang: Lang): string {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

export function url(lang: Lang, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${langPrefix(lang)}${clean}`;
}

type Dict = Record<string, string>;

const ru: Dict = {
  siteName: 'Гайдбук Hamkorbank',
  siteShort: 'Гайдбук',
  menu: 'Меню',
  close: 'Закрыть',
  search: 'Поиск',
  searchPlaceholder: 'Например: IMEI, отпуск, зарплата',
  searchEmpty: 'Ничего не нашлось. Попробуйте другое слово.',
  searchHint: 'Ищем по всем страницам и частым вопросам',
  home: 'Главная',
  local: 'Я локальный кандидат',
  localShort: 'Локальным',
  localLead: 'Первый день, график, зарплата, доступы и кто вам поможет.',
  expat: 'Я экспат',
  expatShort: 'Экспатам',
  expatLead: 'Переезд, первые 72 часа, документы, жильё, семья и жизнь в Узбекистане.',
  chooseTitle: 'С чего начнём?',
  heroTitle: 'Добро пожаловать в команду Hamkorbank',
  heroLead: 'Здесь собрано всё, что нужно в первые дни и месяцы: по шагам, без лишнего. Не нужно запоминать — возвращайтесь, когда возникнет вопрос.',
  popular: 'Чаще всего открывают',
  faq: 'Частые вопросы',
  faqShort: 'Вопросы',
  faqLead: 'Короткие ответы из всех разделов гайдбука.',
  faqSearch: 'Найти вопрос',
  short: 'Коротко',
  checked: 'Проверено',
  sources: 'Источники',
  confirm: 'Часть сведений уточняется. Перед важными шагами сверьтесь со специалистом по адаптации или HR.',
  next: 'Дальше',
  prev: 'Назад',
  pages: 'страниц',
  forWhom: 'Для кого',
  both: 'Для всех',
  audienceSwitch: 'Ваш раздел',
  guideName: 'Гид',
  guideHello: 'Я подскажу, с чего начать. Выберите свой раздел — дальше пойдём по шагам.',
  manifest: 'Гайдбук идёт рядом с вами: от сборов и первых 72 часов до зарплаты, отпуска и выходных в новом городе. Читайте по порядку или открывайте только то, что нужно сегодня.',
  translationSoon: 'Перевод на этот язык готовится. Пока показываем русскую версию.',
  style: 'Стиль',
  styleNote: 'Предпросмотр: выберите вариант оформления',
  contacts: 'Контакты',
  emergency: 'Экстренные номера',
  skip: 'Перейти к содержанию',
  backTop: 'Наверх',
  minutes: 'мин чтения',
  allSections: 'Все разделы',
  onThisPage: 'На этой странице',
};

const en: Dict = {
  ...ru,
  siteName: 'Hamkorbank Guidebook',
  siteShort: 'Guidebook',
  menu: 'Menu',
  close: 'Close',
  search: 'Search',
  searchPlaceholder: 'For example: IMEI, leave, salary',
  searchEmpty: 'Nothing found. Try another word.',
  searchHint: 'Searching all pages and FAQs',
  home: 'Home',
  local: 'I am a local candidate',
  localShort: 'Local',
  localLead: 'First day, schedule, salary, access and who will help you.',
  expat: 'I am an expat',
  expatShort: 'Expats',
  expatLead: 'Relocation, the first 72 hours, documents, housing, family and life in Uzbekistan.',
  chooseTitle: 'Where shall we start?',
  heroTitle: 'Welcome to the Hamkorbank team',
  heroLead: 'Everything you need in your first days and months, step by step. No need to memorise it — come back whenever a question comes up.',
  popular: 'Most opened',
  faq: 'FAQ',
  faqShort: 'FAQ',
  faqLead: 'Short answers from every section of the guidebook.',
  faqSearch: 'Find a question',
  short: 'In short',
  checked: 'Checked',
  sources: 'Sources',
  confirm: 'Some details are being confirmed. Before important steps, check with your adaptation specialist or HR.',
  next: 'Next',
  prev: 'Back',
  pages: 'pages',
  forWhom: 'For',
  both: 'Everyone',
  audienceSwitch: 'Your section',
  guideName: 'Guide',
  guideHello: 'I will show you where to start. Pick your section and we will go step by step.',
  manifest: 'The guidebook walks with you: from packing and the first 72 hours to salary, holidays and weekends in a new city. Read it in order, or open only what you need today.',
  translationSoon: 'The English translation is in progress. The Russian version is shown for now.',
  style: 'Style',
  styleNote: 'Preview: choose a design option',
  contacts: 'Contacts',
  emergency: 'Emergency numbers',
  skip: 'Skip to content',
  backTop: 'Back to top',
  minutes: 'min read',
  allSections: 'All sections',
  onThisPage: 'On this page',
};

const uz: Dict = {
  ...ru,
  siteName: 'Hamkorbank qoʻllanmasi',
  siteShort: 'Qoʻllanma',
  menu: 'Menyu',
  close: 'Yopish',
  search: 'Qidiruv',
  searchPlaceholder: 'Masalan: IMEI, taʼtil, maosh',
  searchEmpty: 'Hech narsa topilmadi. Boshqa soʻz bilan urinib koʻring.',
  searchHint: 'Barcha sahifalar va savollar boʻyicha qidiramiz',
  home: 'Bosh sahifa',
  local: 'Men mahalliy nomzodman',
  localShort: 'Mahalliy',
  localLead: 'Birinchi kun, ish tartibi, maosh, kirish huquqlari va kim yordam beradi.',
  expat: 'Men ekspatman',
  expatShort: 'Ekspatlar',
  expatLead: 'Koʻchib kelish, dastlabki 72 soat, hujjatlar, uy-joy, oila va Oʻzbekistondagi hayot.',
  chooseTitle: 'Nimadan boshlaymiz?',
  heroTitle: 'Hamkorbank jamoasiga xush kelibsiz',
  heroLead: 'Dastlabki kunlar va oylarda kerak boʻladigan hamma narsa — bosqichma-bosqich.',
  popular: 'Koʻp ochiladi',
  faq: 'Koʻp beriladigan savollar',
  faqShort: 'Savollar',
  faqLead: 'Qoʻllanmaning barcha boʻlimlaridan qisqa javoblar.',
  faqSearch: 'Savolni topish',
  short: 'Qisqacha',
  checked: 'Tekshirildi',
  sources: 'Manbalar',
  next: 'Keyingi',
  prev: 'Orqaga',
  both: 'Hamma uchun',
  audienceSwitch: 'Boʻlimingiz',
  guideName: 'Yoʻlboshchi',
  translationSoon: 'Oʻzbek tilidagi tarjima tayyorlanmoqda. Hozircha rus tilidagi versiya koʻrsatilmoqda.',
  style: 'Uslub',
  contacts: 'Kontaktlar',
  emergency: 'Favqulodda raqamlar',
  skip: 'Mazmunga oʻtish',
  allSections: 'Barcha boʻlimlar',
  onThisPage: 'Ushbu sahifada',
};

const DICTS: Record<Lang, Dict> = { ru, en, uz };

export function t(lang: Lang) {
  return (key: string) => DICTS[lang][key] ?? ru[key] ?? key;
}
