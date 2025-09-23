// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content'

// 2. Import loader(s)
import { glob } from 'astro/loaders'

// 3. Define your collection(s)
const insights = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
    status: z.string().optional(),
    categories: z.array(z.any()).optional(),
    tags: z.array(z.any()).optional(),
    // campi immagine opzionali usati nelle card e nei metadati
    image: z.string().optional(),
    ogImage: z.string().optional(),
    featuredImage: z.string().optional(),
    slug: z.string().optional(),
    lang: z.string().optional(),
    // mapping i18n
    sourceFile: z.string().optional(),
    sourceSlug: z.string().optional(),
    sourceLang: z.string().optional(),
  }),
})

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
  }),
})

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
    kpi: z.string().or(z.array(z.string())).optional(),
    sector: z.string().optional(),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    tags: z.array(z.any()).optional(),
  }),
})

// 4. Export a single `collections` object to register you collection(s)
export const collections = { insights, pages, caseStudies }
