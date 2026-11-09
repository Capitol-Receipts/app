// Public URL shapes. Every one of these must keep working after any move; tests/urls.test.mjs checks them.
export const RECORD_TYPES = ['member', 'past-member', 'appointee', 'nominee', 'judge', 'bill', 'vote', 'pac', 'lobbying',
  'lobbying-firm', 'company', 'committee', 'caucus', 'race', 'outside-group', 'ethics', 'state', 'district', 'stock',
  'official-trades', 'reports', 'guides'] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const slug = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const recordPath = (t: RecordType, id: string | number, name?: string, lang?: 'es') =>
  `${lang ? '/es' : ''}/${t}/${encodeURIComponent(String(id))}${name ? '/' + slug(name) : ''}`;
