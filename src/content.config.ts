import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const districtCollection = defineCollection({
  loader: glob({ pattern: ['*.md'], base: 'src/data/districts' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    metro: z.string(),
    rentFrom: z.string(),
    excerpt: z.string(),
  }),
});

export const collections = {
  district: districtCollection,
};
