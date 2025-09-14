/**
 * Utility per calcolare articoli correlati
 * Logica basata su categorie, tag e date per trovare contenuti rilevanti
 */

import type { CollectionEntry } from 'astro:content'

export interface RelatedPost {
  entry: CollectionEntry<'insights'>
  score: number
  reasons: string[]
}

/**
 * Calcola articoli correlati per un post specifico
 * 
 * @param currentPost - Il post corrente
 * @param allPosts - Tutti i post disponibili
 * @param maxResults - Numero massimo di risultati (default: 4)
 * @param sameLangOnly - Se includere solo post nella stessa lingua (default: true)
 */
export function getRelatedPosts(
  currentPost: CollectionEntry<'insights'>,
  allPosts: CollectionEntry<'insights'>[],
  maxResults: number = 4,
  sameLangOnly: boolean = true
): RelatedPost[] {
  const currentCategories = currentPost.data.categories || []
  const currentTags = currentPost.data.tags || []
  const currentLang = currentPost.data.lang || 'it'
  const currentDate = new Date(currentPost.data.date || 0)
  
  // Filtra e calcola score per ogni post
  const candidates = allPosts
    .filter(post => {
      // Escludi il post corrente
      if (post.id === currentPost.id) return false
      
      // Solo post pubblicati
      if (post.data.status !== 'publish') return false
      
      // Filtro lingua se richiesto
      if (sameLangOnly && (post.data.lang || 'it') !== currentLang) return false
      
      return true
    })
    .map(post => {
      const postCategories = post.data.categories || []
      const postTags = post.data.tags || []
      const postDate = new Date(post.data.date || 0)
      
      let score = 0
      const reasons: string[] = []
      
      // 1. Categorie in comune (peso alto)
      const commonCategories = currentCategories.filter(cat => 
        postCategories.some(pCat => normalizeText(cat) === normalizeText(pCat))
      )
      if (commonCategories.length > 0) {
        score += commonCategories.length * 10
        reasons.push(`${commonCategories.length} categorie in comune`)
      }
      
      // 2. Tag in comune (peso medio)
      const commonTags = currentTags.filter(tag => 
        postTags.some(pTag => normalizeText(tag) === normalizeText(pTag))
      )
      if (commonTags.length > 0) {
        score += commonTags.length * 5
        reasons.push(`${commonTags.length} tag in comune`)
      }
      
      // 3. Vicinanza temporale (peso basso ma importante)
      const daysDiff = Math.abs((currentDate.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff < 90) { // Ultimi 3 mesi
        score += 3
        reasons.push('pubblicato di recente')
      } else if (daysDiff < 365) { // Ultimo anno
        score += 1
        reasons.push('stesso periodo')
      }
      
      // 4. Bonus per titoli con parole simili (analisi semplice)
      const titleWords = normalizeText(currentPost.data.title).split(/\s+/)
      const postTitleWords = normalizeText(post.data.title).split(/\s+/)
      const commonWords = titleWords.filter(word => 
        word.length > 3 && postTitleWords.includes(word)
      )
      if (commonWords.length > 0) {
        score += commonWords.length * 2
        reasons.push('argomento simile')
      }
      
      return {
        entry: post,
        score,
        reasons
      }
    })
    .filter(candidate => candidate.score > 0) // Solo candidati con almeno un punto
    .sort((a, b) => b.score - a.score) // Ordina per score decrescente
  
  return candidates.slice(0, maxResults)
}

/**
 * Normalizza testo per confronti (lowercase, rimuove accenti)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^\w\s]/g, ' ') // Rimuove punteggiatura
    .replace(/\s+/g, ' ') // Normalizza spazi
    .trim()
}

/**
 * Versione semplificata per ottenere solo gli articoli senza score
 */
export function getRelatedPostsSimple(
  currentPost: CollectionEntry<'insights'>,
  allPosts: CollectionEntry<'insights'>[],
  maxResults: number = 4
): CollectionEntry<'insights'>[] {
  return getRelatedPosts(currentPost, allPosts, maxResults).map(rp => rp.entry)
}

/**
 * Fallback: ottieni post della stessa categoria se non ci sono correlazioni
 */
export function getFallbackPosts(
  currentPost: CollectionEntry<'insights'>,
  allPosts: CollectionEntry<'insights'>[],
  maxResults: number = 4
): CollectionEntry<'insights'>[] {
  const currentCategories = currentPost.data.categories || []
  const currentLang = currentPost.data.lang || 'it'
  
  if (currentCategories.length === 0) {
    // Se non ha categorie, prendi i più recenti della stessa lingua
    return allPosts
      .filter(post => 
        post.id !== currentPost.id && 
        post.data.status === 'publish' &&
        (post.data.lang || 'it') === currentLang
      )
      .sort((a, b) => new Date(b.data.date || 0).getTime() - new Date(a.data.date || 0).getTime())
      .slice(0, maxResults)
  }
  
  // Altrimenti, prendi dalla prima categoria
  const primaryCategory = currentCategories[0]
  return allPosts
    .filter(post => 
      post.id !== currentPost.id && 
      post.data.status === 'publish' &&
      (post.data.lang || 'it') === currentLang &&
      (post.data.categories || []).some(cat => 
        normalizeText(cat) === normalizeText(primaryCategory)
      )
    )
    .sort((a, b) => new Date(b.data.date || 0).getTime() - new Date(a.data.date || 0).getTime())
    .slice(0, maxResults)
}
