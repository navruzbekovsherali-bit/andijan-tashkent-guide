import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const districtSchema = z.object({
  title: z.string(),
  order: z.number(),
  metro: z.string(),
  rentFrom: z.string(),
  excerpt: z.string(),
});

const districtCollection = defineCollection({
  loader: glob({ pattern: ['*.md'], base: 'src/data/districts' }),
  schema: districtSchema,
});

// Узбекская (кириллица) версия гайдов по районам — та же схема, отдельная
// папка. id файла (slug) совпадает с src/data/districts, чтобы можно было
// сопоставлять пары по district.id.
const districtUzCollection = defineCollection({
  loader: glob({ pattern: ['*.md'], base: 'src/data/districts-uz' }),
  schema: districtSchema,
});

export const collections = {
  district: districtCollection,
  districtUz: districtUzCollection,
};
