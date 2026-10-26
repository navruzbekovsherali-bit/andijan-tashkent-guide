import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guide = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guide' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    audience: z.array(z.enum(['local', 'expat'])).min(1),
    section: z.enum(['start', 'arrival', 'first-days', 'work', 'living', 'family', 'country', 'travel', 'help']),
    order: z.number().default(100),
    checked: z.coerce.date().optional(),
    needsConfirmation: z.boolean().default(false),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
    tldr: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { guide };
