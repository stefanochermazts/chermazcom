import { defineCollection, z } from 'astro:content'

const baseFields = {
  title: z.string(),
  slug: z.string().optional(),
  date: z.coerce.date().optional(),
  status: z.enum(['publish', 'draft']).default('publish').optional(),
  excerpt: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  lang: z.string().optional(),
}

const insights = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    description: z.string().optional(),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    featuredImage: z.string().optional(),
  }),
  slug: ({ data, defaultSlug }) => (data.slug ? data.slug : defaultSlug),
})

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    ...baseFields,
    sector: z.string().optional(),
    kpi: z.array(z.string()).optional(),
    image: z.string().optional(),
    ogImage: z.string().optional(),
    featuredImage: z.string().optional(),
  }),
  slug: ({ data, defaultSlug }) => (data.slug ? data.slug : defaultSlug),
})

export const collections = {
  insights,
  'case-studies': caseStudies,
}


