import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';
import type { RehypePlugin, RemarkPlugin } from '@astrojs/markdown-remark';

export const readingTimeRemarkPlugin: RemarkPlugin = () => {
  return function (tree, file) {
    const textOnPage = toString(tree);
    const readingTime = Math.ceil(getReadingTime(textOnPage).minutes);

    if (typeof file?.data?.astro?.frontmatter !== 'undefined') {
      file.data.astro.frontmatter.readingTime = readingTime;
    }
  };
};

export const responsiveTablesRehypePlugin: RehypePlugin = () => {
  return function (tree) {
    if (!tree.children) return;

    for (let i = 0; i < tree.children.length; i++) {
      const child = tree.children[i];

      if (child.type === 'element' && child.tagName === 'table') {
        tree.children[i] = {
          type: 'element',
          tagName: 'div',
          properties: {
            style: 'overflow:auto',
          },
          children: [child],
        };

        i++;
      }
    }
  };
};

/* eslint-disable @typescript-eslint/no-explicit-any */

const nodeText = (node: any): string => {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
  return '';
};

/**
 * Turns paragraphs / short headings that start with an attention marker
 * ("⚠️", "Важно:", "Критически важно", "ЗОЛОТОЕ ПРАВИЛО", "Внимание", "Помните")
 * into styled callout blocks. A trigger heading also pulls in the following
 * siblings up to the next heading, so the whole tip reads as one card.
 *
 * A third, stricter DANGER tier (`.md-callout--danger`, red) is reserved for
 * the /arenda scam-warning system: the "Топ-5 схем мошенничества" heading and
 * its list, plus the "ЗОЛОТОЕ ПРАВИЛО" / "Главное правило безопасности" line.
 * DANGER is checked first, so those never fall through to the amber WARN tier.
 * None of the district guides contain a DANGER trigger (verified), so this is
 * additive — existing WARN/INFO callouts are unchanged.
 */
export const calloutsRehypePlugin: RehypePlugin = () => {
  const DANGER =
    /^\s*(❌|🚩|красн[а-яё]*\s+флаг|топ-?5\s+схем|схема\s+мошенничества|золотое\s+правило|главное\s+правило\s+безопасности)/i;
  const WARN = /^\s*(⚠️|критически важно|золотое правило|внимание|помните\b)/i;
  const INFO = /^\s*(важно[:!]|важно\s+[а-яё])/i;
  const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

  return function (tree: any) {
    const kids: any[] = tree.children;
    if (!Array.isArray(kids)) return;

    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (node?.type !== 'element') continue;

      const text = nodeText(node).trim();
      const isDanger = DANGER.test(text);
      const isWarn = !isDanger && WARN.test(text);
      const isInfo = !isDanger && !isWarn && INFO.test(text);
      if (!isDanger && !isWarn && !isInfo) continue;

      const variant = isDanger ? 'md-callout--danger' : isWarn ? 'md-callout--warn' : 'md-callout--info';

      if (node.tagName === 'p') {
        node.properties = node.properties || {};
        node.properties.className = ['md-callout', variant];
        continue;
      }

      if (HEADINGS.has(node.tagName)) {
        // Absorb siblings until the next heading of the same or higher level.
        const level = Number(node.tagName[1]);
        let end = i + 1;
        while (end < kids.length) {
          const sib = kids[end];
          if (sib?.type === 'element' && HEADINGS.has(sib.tagName) && Number(sib.tagName[1]) <= level) {
            break;
          }
          end++;
        }
        const collected = kids.slice(i, end).filter((n) => !(n.type === 'text' && !n.value?.trim()));
        const aside = {
          type: 'element',
          tagName: 'aside',
          properties: { className: ['md-callout', variant] },
          children: collected,
        };
        kids.splice(i, end - i, aside);
      }
    }
  };
};

/**
 * Marks "what to bring / what to do" lists as checklist cards.
 *
 *  - a top-level <ul> that contains a list item opening with a doc-pack lead
 *    ("Пакет документов:", "Пакет документов для школы:", "Документы: …",
 *    "Что нужно …:") → the <ul> gets `.md-checklist`, that <li> gets
 *    `.md-checklist__title`;
 *  - a heading matching "… чек-лист сделки" → the next sibling <ul> before the
 *    following heading gets `.md-checklist`.
 *
 * Only `tree.children` (top level) is scanned, so a list already absorbed into
 * a callout <aside> by calloutsRehypePlugin is left alone. No district guide
 * contains either trigger (verified), so this is additive. CSS lives in
 * CollapsibleContent.astro (`ul.md-checklist`).
 */
export const checklistRehypePlugin: RehypePlugin = () => {
  // NB: JS \b is ASCII-only and never fires next to Cyrillic, so match the
  // optional trailing words explicitly instead.
  const DOC_LEAD = /^\s*(пакет документов|документы|что нужно)(?:[^:\n]{0,40})?:/i;
  const HEAD_LEAD = /чек-?лист\s+сделки/i;
  const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

  const addClass = (node: any, cls: string) => {
    node.properties = node.properties || {};
    const cur = node.properties.className;
    const list = Array.isArray(cur) ? cur : cur ? [cur] : [];
    if (!list.includes(cls)) list.push(cls);
    node.properties.className = list;
  };

  return function (tree: any) {
    const kids: any[] = tree.children;
    if (!Array.isArray(kids)) return;

    for (let i = 0; i < kids.length; i++) {
      const node = kids[i];
      if (node?.type !== 'element') continue;

      if (HEADINGS.has(node.tagName) && HEAD_LEAD.test(nodeText(node))) {
        for (let j = i + 1; j < kids.length; j++) {
          const sib = kids[j];
          if (sib?.type !== 'element') continue;
          if (HEADINGS.has(sib.tagName)) break;
          if (sib.tagName === 'ul') {
            addClass(sib, 'md-checklist');
            break;
          }
        }
        continue;
      }

      if (node.tagName === 'ul' && Array.isArray(node.children)) {
        const lead = node.children.find(
          (c: any) => c?.type === 'element' && c.tagName === 'li' && DOC_LEAD.test(nodeText(c))
        );
        if (lead) {
          addClass(node, 'md-checklist');
          addClass(lead, 'md-checklist__title');
        }
      }
    }
  };
};

/**
 * Makes bare portal URLs in the guide text tappable
 * (my.gov.uz, maktab.uz, ijara.soliq.uz, joymee.uz, uybor.uz, emehmon.uz …).
 */
export const linkifyRehypePlugin: RehypePlugin = () => {
  const URL_RE = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:uz|com|ru|net|org)(?:\/[^\s<>()]*)?)/gi;
  const SKIP = new Set(['a', 'code', 'pre', 'kbd', 'script', 'style']);

  const walk = (node: any) => {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === 'element' && SKIP.has(node.tagName)) return;

    const out: any[] = [];
    for (const child of node.children) {
      if (child.type !== 'text' || !URL_RE.test(child.value)) {
        walk(child);
        out.push(child);
        continue;
      }

      URL_RE.lastIndex = 0;
      const value: string = child.value;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = URL_RE.exec(value)) !== null) {
        const raw = m[0];
        // Don't grab a trailing sentence dot / comma.
        const clean = raw.replace(/[.,;:!?)]+$/, '');
        const start = m.index;
        if (value[start - 1] === '@') continue; // e-mail, skip

        if (start > last) out.push({ type: 'text', value: value.slice(last, start) });
        const withProto = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
        const href = withProto.replace(/^https?:\/\/[^/]+/i, (s) => s.toLowerCase());
        out.push({
          type: 'element',
          tagName: 'a',
          properties: { href, target: '_blank', rel: ['noopener', 'noreferrer'] },
          children: [{ type: 'text', value: clean }],
        });
        last = start + clean.length;
      }
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    }
    node.children = out;
  };

  return function (tree: any) {
    walk(tree);
  };
};

/**
 * Wraps key figures in guide text — travel times, distances, metro stops,
 * prices, percentages — in <span class="gv-stat"> so the design can make them
 * stand out from the surrounding prose.
 */
export const highlightStatsRehypePlugin: RehypePlugin = () => {
  // NB: JS \b is ASCII-only, so it never fires next to Cyrillic — use a
  // "not followed by a Cyrillic letter" lookahead to end these tokens.
  const NB = '(?![А-Яа-яЁё])';
  const NUM = '\\d+(?:[.,]\\d+)?';
  const RANGE = `${NUM}(?:\\s*(?:–|—|-|до)\\s*${NUM})?`;
  const STAT_RE = new RegExp(
    [
      `\\$\\s?\\d[\\d\\s]*(?:\\s*(?:–|—|-)\\s*\\$?\\s?\\d[\\d\\s]*)?\\+?`, // money
      `${RANGE}\\s*(?:мин(?:ут[а-яё]*)?|час(?:а|ов)?)${NB}`, // time
      `${RANGE}\\s*км${NB}`, // distance in km
      `${NUM}(?:\\s*(?:–|—|-)\\s*${NUM})?\\s*%`, // percent
      `\\d+(?:\\s*(?:–|—|-)\\s*\\d+)?\\s*останов(?:ок|ки|ка)${NB}`, // metro stops
    ].join('|'),
    'gi'
  );
  const SKIP = new Set(['a', 'code', 'pre', 'kbd', 'script', 'style', 'h1', 'h2', 'h3', 'h4', 'table', 'thead']);

  const walk = (node: any) => {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === 'element' && SKIP.has(node.tagName)) return;

    const out: any[] = [];
    for (const child of node.children) {
      if (child.type !== 'text') {
        walk(child);
        out.push(child);
        continue;
      }
      const value: string = child.value;
      STAT_RE.lastIndex = 0;
      if (!STAT_RE.test(value)) {
        out.push(child);
        continue;
      }
      STAT_RE.lastIndex = 0;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = STAT_RE.exec(value)) !== null) {
        const token = m[0].replace(/\s+$/, '');
        if (!token) {
          STAT_RE.lastIndex++;
          continue;
        }
        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        out.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['gv-stat'] },
          children: [{ type: 'text', value: token }],
        });
        last = m.index + token.length;
      }
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    }
    node.children = out;
  };

  return function (tree: any) {
    walk(tree);
  };
};

/**
 * Bolds the short "label:" that opens many list items in the guide
 * ("Адрес:", "На метро:", "В час пик:", "Что попробовать:" …) so a scan
 * picks up the structure without reading every line.
 */
export const labelLeadsRehypePlugin: RehypePlugin = () => {
  const LEAD_RE = /^([A-ZА-ЯЁ][^:,.!?]{1,44}?):(\s)/;

  const apply = (node: any) => {
    const first = node.children?.[0];
    if (!first || first.type !== 'text') return;
    const m = LEAD_RE.exec(first.value);
    if (!m) return;
    const label = m[1];
    if (label.split(/\s+/).length > 6) return;
    // Need real content after the label.
    const rest = first.value.slice(m[0].length);
    if (!rest.trim() && node.children.length < 2) return;

    node.children[0] = { type: 'text', value: m[2] + rest };
    node.children.unshift({
      type: 'element',
      tagName: 'strong',
      properties: { className: ['gv-lead'] },
      children: [{ type: 'text', value: label }],
    });
  };

  const walk = (node: any) => {
    if (!node || !Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (child.type === 'element' && (child.tagName === 'li' || child.tagName === 'p')) apply(child);
      walk(child);
    }
  };

  return function (tree: any) {
    walk(tree);
  };
};
