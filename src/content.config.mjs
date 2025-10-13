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

const homeHero = z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  primaryLabel: z.string().optional(),
  secondaryLabel: z.string().optional(),
  afterButtons: z.string().optional(),
}).optional()

const homeAbout = z.object({
  title: z.string().optional(),
  lead: z.string().optional(),
  paragraph: z.string().optional(),
  tags: z.array(z.string()).optional(),
  linkHref: z.string().optional(),
  linkText: z.string().optional(),
  photoLabel: z.string().optional(),
  photoName: z.string().optional(),
  yearsBadgeValue: z.string().optional(),
  yearsBadgeSubtitle: z.string().optional(),
  imageSrc: z.string().optional(),
  imageAlt: z.string().optional(),
  imageAspectClass: z.string().optional(),
}).optional()

const homeServiceItem = z.object({
  icon: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  cta: z.string().optional(),
})

const homeServices = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  servicesLinkBase: z.string().optional(),
  bottomCtaText: z.string().optional(),
  bottomCtaHref: z.string().optional(),
  items: z.array(homeServiceItem).optional(),
  afterCta: z.string().optional(),
}).optional()

const homeExpertise = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional(),
  areas: z.array(z.object({
    icon: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
}).optional()

const homeCaseStudies = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  allProjectsLabel: z.string().optional(),
}).optional()

const homeLatestInsights = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  allArticlesLabel: z.string().optional(),
  locale: z.string().optional(),
}).optional()

const testimonialItem = z.object({
  author: z.string().optional(),
  quote: z.string().optional(),
})

const homeTestimonials = z.object({
  title: z.string().optional(),
  items: z.array(testimonialItem).optional(),
}).optional()

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    slug: z.string().optional(),
    date: z.string().or(z.date()).optional(),
    excerpt: z.string().optional(),
    lang: z.string().optional(),
    status: z.string().optional(),
    // Sezioni home (opzionali)
    hero: homeHero,
    about: homeAbout,
    services: homeServices,
    expertise: homeExpertise,
    caseStudies: homeCaseStudies,
    latestInsights: homeLatestInsights,
    testimonials: homeTestimonials,
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
