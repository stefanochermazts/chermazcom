/**
 * Test script per verificare l'algoritmo degli articoli correlati
 * 
 * Per eseguire il test:
 * node --loader ts-node/esm src/debug/test-related-posts.ts
 */

// Mock della struttura CollectionEntry per il test
interface MockPost {
  id: string
  data: {
    title: string
    categories?: string[]
    tags?: string[]
    date?: string
    lang?: string
    status?: string
  }
}

// Import delle funzioni da testare
// Nota: Questo è un mock per il test, nel vero ambiente useresti le funzioni reali
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function calculateRelatedScore(currentPost: MockPost, candidatePost: MockPost): { score: number, reasons: string[] } {
  const currentCategories = currentPost.data.categories || []
  const currentTags = currentPost.data.tags || []
  const currentDate = new Date(currentPost.data.date || 0)
  
  const postCategories = candidatePost.data.categories || []
  const postTags = candidatePost.data.tags || []
  const postDate = new Date(candidatePost.data.date || 0)
  
  let score = 0
  const reasons: string[] = []
  
  // Categorie in comune
  const commonCategories = currentCategories.filter(cat => 
    postCategories.some(pCat => normalizeText(cat) === normalizeText(pCat))
  )
  if (commonCategories.length > 0) {
    score += commonCategories.length * 10
    reasons.push(`${commonCategories.length} categorie in comune`)
  }
  
  // Tag in comune
  const commonTags = currentTags.filter(tag => 
    postTags.some(pTag => normalizeText(tag) === normalizeText(pTag))
  )
  if (commonTags.length > 0) {
    score += commonTags.length * 5
    reasons.push(`${commonTags.length} tag in comune`)
  }
  
  // Vicinanza temporale
  const daysDiff = Math.abs((currentDate.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 90) {
    score += 3
    reasons.push('pubblicato di recente')
  } else if (daysDiff < 365) {
    score += 1
    reasons.push('stesso periodo')
  }
  
  // Titoli simili
  const titleWords = normalizeText(currentPost.data.title).split(/\s+/)
  const postTitleWords = normalizeText(candidatePost.data.title).split(/\s+/)
  const commonWords = titleWords.filter(word => 
    word.length > 3 && postTitleWords.includes(word)
  )
  if (commonWords.length > 0) {
    score += commonWords.length * 2
    reasons.push('argomento simile')
  }
  
  return { score, reasons }
}

// Mock data per il test
const mockPosts: MockPost[] = [
  {
    id: 'current-post',
    data: {
      title: 'Implementare Microsoft 365 in azienda',
      categories: ['Microsoft 365', 'Enterprise'],
      tags: ['SharePoint', 'Teams', 'Security'],
      date: '2024-12-01',
      lang: 'it',
      status: 'publish'
    }
  },
  {
    id: 'highly-related',
    data: {
      title: 'SharePoint Online: best practices per aziende',
      categories: ['Microsoft 365', 'SharePoint'],
      tags: ['SharePoint', 'Governance', 'Security'],
      date: '2024-11-15',
      lang: 'it',
      status: 'publish'
    }
  },
  {
    id: 'medium-related',
    data: {
      title: 'Teams governance e gestione utenti',
      categories: ['Microsoft 365'],
      tags: ['Teams', 'Governance'],
      date: '2024-10-01',
      lang: 'it',
      status: 'publish'
    }
  },
  {
    id: 'low-related',
    data: {
      title: 'Sicurezza informatica in azienda',
      categories: ['Sicurezza'],
      tags: ['Security', 'Firewall'],
      date: '2024-09-01',
      lang: 'it',
      status: 'publish'
    }
  },
  {
    id: 'unrelated',
    data: {
      title: 'Sviluppo web con React',
      categories: ['Sviluppo'],
      tags: ['React', 'JavaScript'],
      date: '2024-08-01',
      lang: 'it',
      status: 'publish'
    }
  },
  {
    id: 'wrong-language',
    data: {
      title: 'Microsoft 365 Enterprise Guide',
      categories: ['Microsoft 365'],
      tags: ['SharePoint', 'Teams'],
      date: '2024-12-01',
      lang: 'en',
      status: 'publish'
    }
  }
]

console.log('🧪 Testing Related Posts Algorithm\n')
console.log('=' .repeat(60))

const currentPost = mockPosts[0] // 'current-post'
const candidates = mockPosts.slice(1) // Altri post

console.log(`\n📄 Current Post: "${currentPost.data.title}"`)
console.log(`   Categories: [${currentPost.data.categories?.join(', ')}]`)
console.log(`   Tags: [${currentPost.data.tags?.join(', ')}]`)
console.log(`   Date: ${currentPost.data.date}`)

console.log('\n🔍 Testing correlation with other posts:')
console.log('-'.repeat(60))

candidates.forEach(candidate => {
  const { score, reasons } = calculateRelatedScore(currentPost, candidate)
  
  console.log(`\n📖 "${candidate.data.title}"`)
  console.log(`   Categories: [${candidate.data.categories?.join(', ')}]`)
  console.log(`   Tags: [${candidate.data.tags?.join(', ')}]`)
  console.log(`   Score: ${score}`)
  console.log(`   Reasons: ${reasons.join(', ') || 'None'}`)
  
  let rating = '❌ Not related'
  if (score >= 15) rating = '🔥 Highly related'
  else if (score >= 8) rating = '✅ Related'
  else if (score >= 3) rating = '⚠️ Somewhat related'
  
  console.log(`   Rating: ${rating}`)
})

// Test ordinamento
console.log('\n📊 Final ranking (sorted by score):')
console.log('-'.repeat(60))

const scored = candidates
  .map(candidate => ({
    ...candidate,
    ...calculateRelatedScore(currentPost, candidate)
  }))
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)

scored.forEach((item, index) => {
  console.log(`${index + 1}. "${item.data.title}" (Score: ${item.score})`)
  console.log(`   Reasons: ${item.reasons.join(', ')}`)
})

console.log('\n🎯 Algorithm Performance:')
console.log('-'.repeat(60))
console.log(`✅ Correctly identified highly related: ${scored[0]?.id === 'highly-related' ? 'Yes' : 'No'}`)
console.log(`✅ Filtered out wrong language: ${!scored.some(s => s.id === 'wrong-language') ? 'Yes' : 'No'}`)
console.log(`✅ Ranked by relevance: ${scored.map(s => s.score).every((score, i, arr) => i === 0 || score <= arr[i-1]) ? 'Yes' : 'No'}`)

console.log('\n✅ Test completed!')

export {}
