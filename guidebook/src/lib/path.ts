import type { Lang } from './i18n';

/** The expat's route as one line: five stages from the visa to the first month. Each step opens its page;
    the tick is kept on the device (see expatPath() in client.ts). */
type L = Record<Lang, string>;
export type PathStep = { id: string; slug: string; title: L; hint: L };
export type PathStage = { id: string; title: L; when: L; steps: PathStep[] };

export const PATH_TX: Record<Lang, { title: string; lead: string; of: string; done: string; mark: string; all: string }> = {
  ru: { title: 'Ваш путь', lead: 'От визы до первого месяца — по порядку. Отмечайте, что уже сделали.', of: 'из', done: 'сделано', mark: 'Отметить как сделанное', all: 'Все шаги пройдены. Добро пожаловать в команду!' },
  en: { title: 'Your route', lead: 'From the visa to your first month, in order. Tick off what you have done.', of: 'of', done: 'done', mark: 'Mark as done', all: 'Every step is done. Welcome to the team!' },
  uz: { title: 'Sizning yoʻlingiz', lead: 'Vizadan birinchi oygacha — tartib bilan. Bajarganingizni belgilang.', of: '/', done: 'bajarildi', mark: 'Bajarildi deb belgilash', all: 'Barcha qadamlar bajarildi. Jamoaga xush kelibsiz!' },
};

export const EXPAT_PATH: PathStage[] = [
  {
    id: 'before',
    title: { ru: 'До приезда', en: 'Before you come', uz: 'Kelishdan oldin' },
    when: { ru: 'до вылета', en: 'before the flight', uz: 'parvozgacha' },
    steps: [
      { id: 'visa', slug: 'visa', title: { ru: 'Оформить визу', en: 'Get your visa', uz: 'Vizani rasmiylashtirish' }, hint: { ru: 'Анкета на visa.mfa.uz, ответ через 10–15 рабочих дней', en: 'The form on visa.mfa.uz, an answer in 10–15 working days', uz: 'visa.mfa.uz’dagi anketa, javob 10–15 ish kunida' } },
      { id: 'budget', slug: 'relocation-budget', title: { ru: 'Спланировать бюджет', en: 'Plan your budget', uz: 'Byudjetni rejalashtirish' }, hint: { ru: 'Жильё, еда, транспорт', en: 'Housing, food, transport', uz: 'Uy-joy, oziq-ovqat, transport' } },
      { id: 'packing', slug: 'packing', title: { ru: 'Собрать вещи и документы', en: 'Pack your things and documents', uz: 'Narsalar va hujjatlarni yigʻish' }, hint: { ru: 'И узнать правила таможни', en: 'And learn the customs rules', uz: 'Va bojxona qoidalarini bilib olish' } },
    ],
  },
  {
    id: 'landing',
    title: { ru: 'День прилёта', en: 'Arrival day', uz: 'Kelgan kun' },
    when: { ru: 'день 0', en: 'day 0', uz: '0-kun' },
    steps: [
      { id: 'airport', slug: 'arrival-72h', title: { ru: 'Задекларировать телефон и купить SIM', en: 'Declare your phone and buy a SIM', uz: 'Telefonni deklaratsiya qilish va SIM olish' }, hint: { ru: 'Прямо в аэропорту', en: 'Right at the airport', uz: 'Aeroportning oʻzida' } },
      { id: 'hello', slug: 'support-team', title: { ru: 'Написать специалисту по адаптации', en: 'Message the adaptation specialist', uz: 'Moslashuv boʻyicha mutaxassisga yozish' }, hint: { ru: 'Сообщите, что прилетели, и свой адрес', en: 'Say you have landed and give your address', uz: 'Kelganingizni va manzilingizni ayting' } },
      { id: 'apps', slug: 'apps', title: { ru: 'Установить приложения', en: 'Install the apps', uz: 'Ilovalarni oʻrnatish' }, hint: { ru: 'Такси, карты, оплата', en: 'Taxi, maps, payments', uz: 'Taksi, xaritalar, toʻlov' } },
    ],
  },
  {
    id: 'days3',
    title: { ru: 'Первые 3 дня', en: 'The first 3 days', uz: 'Dastlabki 3 kun' },
    when: { ru: 'дни 1–3', en: 'days 1–3', uz: '1–3-kunlar' },
    steps: [
      { id: 'reg', slug: 'registration', title: { ru: 'Оформить регистрацию', en: 'Get registered', uz: 'Roʻyxatdan oʻtish' }, hint: { ru: 'В отеле её делает отель, в квартире — собственник', en: 'The hotel does it; in a flat, the owner', uz: 'Mehmonxonada — mehmonxona, kvartirada — uy egasi' } },
      { id: 'sos', slug: 'emergency', title: { ru: 'Сохранить экстренные номера', en: 'Save the emergency numbers', uz: 'Favqulodda raqamlarni saqlash' }, hint: { ru: '112 и контакты банка', en: '112 and the bank’s contacts', uz: '112 va bank kontaktlari' } },
    ],
  },
  {
    id: 'week',
    title: { ru: 'Первая неделя', en: 'The first week', uz: 'Birinchi hafta' },
    when: { ru: 'неделя 1', en: 'week 1', uz: '1-hafta' },
    steps: [
      { id: 'firstday', slug: 'first-day-week', title: { ru: 'Пройти первый день в офисе', en: 'Get through your first day at the office', uz: 'Ofisdagi birinchi kun' }, hint: { ru: 'Пропуск, документы, рабочее место', en: 'Pass, paperwork, your desk', uz: 'Ruxsatnoma, hujjatlar, ish joyi' } },
      { id: 'card', slug: 'bank-card', title: { ru: 'Получить зарплатную карту', en: 'Get your salary card', uz: 'Maosh kartasini olish' }, hint: { ru: 'Визит в отделение на 10–15 минут', en: 'A 10–15 minute branch visit', uz: 'Filialga 10–15 daqiqalik tashrif' } },
      { id: 'access', slug: 'system-access', title: { ru: 'Получить доступы к системам', en: 'Get access to the systems', uz: 'Tizimlarga kirish huquqini olish' }, hint: { ru: 'Первый вход и где искать помощь', en: 'First sign-in and where to get help', uz: 'Birinchi kirish va yordam qayerda' } },
      { id: 'permit', slug: 'work-permit', title: { ru: 'Разрешение на работу и ПИНФЛ', en: 'Work permit and PINFL', uz: 'Ishlash ruxsatnomasi va JShShIR' }, hint: { ru: 'Оформляет HR, от вас — документы', en: 'HR handles it; you provide documents', uz: 'HR rasmiylashtiradi, sizdan — hujjatlar' } },
    ],
  },
  {
    id: 'month',
    title: { ru: 'Первый месяц', en: 'The first month', uz: 'Birinchi oy' },
    when: { ru: 'месяц 1', en: 'month 1', uz: '1-oy' },
    steps: [
      { id: 'imei', slug: 'arrival-72h', title: { ru: 'Зарегистрировать IMEI телефона', en: 'Register your phone’s IMEI', uz: 'Telefon IMEI’sini roʻyxatdan oʻtkazish' }, hint: { ru: '30 дней с первой местной SIM-карты', en: '30 days from your first local SIM', uz: 'Birinchi mahalliy SIMdan 30 kun' } },
      { id: 'salary', slug: 'salary-expat', title: { ru: 'Разобраться с зарплатой', en: 'Understand your pay', uz: 'Maoshni tushunib olish' }, hint: { ru: 'Раз в месяц, обычно до 10-го числа', en: 'Once a month, usually by the 10th', uz: 'Oyiga bir marta, odatda 10-sanagacha' } },
      { id: 'med', slug: 'medicine', title: { ru: 'Выбрать страховку и клинику', en: 'Choose insurance and a clinic', uz: 'Sugʻurta va klinikani tanlash' }, hint: { ru: 'Скорая — 103', en: 'The ambulance is 103', uz: 'Tez yordam — 103' } },
      { id: 'life', slug: 'culture', title: { ru: 'Освоиться: культура и обычаи', en: 'Settle in: culture and customs', uz: 'Koʻnikish: madaniyat va odatlar' }, hint: { ru: 'Чай, хлеб и приветствие', en: 'Tea, bread and a greeting', uz: 'Choy, non va salomlashish' } },
    ],
  },
];
