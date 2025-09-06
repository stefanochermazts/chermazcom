// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content'

// 2. Import loader(s)
import { glob } from 'astro/loaders'

// 3. Define your collection(s)
const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string(),
  }),
})

const insights = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
    status: z.string().optional(),
    categories: z.array(z.any()).optional(),
    tags: z.array(z.any()).optional(),
  }),
})

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
  }),
})

// 4. Export a single `collections` object to register you collection(s)
export const collections = { projects, insights, pages }
