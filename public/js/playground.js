/**
 * AI Code Playground - Interactive JavaScript
 * Gestisce l'interfaccia utente e le chiamate API
 */

class CodePlayground {
  constructor() {
    this.initializeElements()
    this.bindEvents()
    this.currentAnalysis = null
  }

  initializeElements() {
    // Input elements
    this.codeInput = document.getElementById('code-input')
    this.languageSelect = document.getElementById('language-select')
    
    // Buttons
    this.analyzeBtn = document.getElementById('analyze-btn')
    this.optimizeBtn = document.getElementById('optimize-btn')
    this.clearBtn = document.getElementById('clear-btn')
    this.copyOptimizedBtn = document.getElementById('copy-optimized-btn')
    
    // UI States
    this.loadingState = document.getElementById('loading-state')
    this.initialState = document.getElementById('initial-state')
    this.analysisResults = document.getElementById('analysis-results')
    this.optimizedResults = document.getElementById('optimized-results')
    this.errorState = document.getElementById('error-state')
    
    // Content containers
    this.explanationContent = document.getElementById('explanation-content')
    this.suggestionsContent = document.getElementById('suggestions-content')
    this.optimizedCode = document.getElementById('optimized-code')
    this.optimizationExplanation = document.getElementById('optimization-explanation')
    this.errorMessage = document.getElementById('error-message')
  }

  bindEvents() {
    this.analyzeBtn.addEventListener('click', () => this.analyzeCode())
    this.optimizeBtn.addEventListener('click', () => this.optimizeCode())
    this.clearBtn.addEventListener('click', () => this.clearAll())
    this.copyOptimizedBtn.addEventListener('click', () => this.copyOptimizedCode())
    
    // Enable optimize button when analysis is complete
    this.codeInput.addEventListener('input', () => {
      if (this.currentAnalysis) {
        this.optimizeBtn.disabled = false
      }
    })
  }

  async analyzeCode() {
    const code = this.codeInput.value.trim()
    const language = this.languageSelect.value
    
    if (!code) {
      this.showError('Inserisci del codice da analizzare.')
      return
    }

    this.showLoading()
    
    try {
      const response = await fetch('/api/playground/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language })
      })

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`)
      }

      const result = await response.json()
      this.currentAnalysis = result
      this.showAnalysisResults(result)
      this.optimizeBtn.disabled = false
      
    } catch (error) {
      console.error('Errore durante l\'analisi:', error)
      this.showError('Errore durante l\'analisi del codice. Riprova più tardi.')
    }
  }

  async optimizeCode() {
    if (!this.currentAnalysis) {
      this.showError('Devi prima analizzare il codice.')
      return
    }

    const code = this.codeInput.value.trim()
    const language = this.languageSelect.value
    
    this.showLoading()
    
    try {
      const response = await fetch('/api/playground/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code, 
          language,
          analysis: this.currentAnalysis 
        })
      })

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`)
      }

      const result = await response.json()
      this.showOptimizationResults(result)
      
    } catch (error) {
      console.error('Errore durante l\'ottimizzazione:', error)
      this.showError('Errore durante l\'ottimizzazione del codice. Riprova più tardi.')
    }
  }

  clearAll() {
    this.codeInput.value = ''
    this.currentAnalysis = null
    this.optimizeBtn.disabled = true
    this.showInitialState()
  }

  async copyOptimizedCode() {
    const code = this.optimizedCode.textContent
    try {
      await navigator.clipboard.writeText(code)
      
      // Visual feedback
      const originalText = this.copyOptimizedBtn.innerHTML
      this.copyOptimizedBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      `
      this.copyOptimizedBtn.classList.add('bg-green-600', 'hover:bg-green-500')
      this.copyOptimizedBtn.classList.remove('bg-zinc-700', 'hover:bg-zinc-600')
      
      setTimeout(() => {
        this.copyOptimizedBtn.innerHTML = originalText
        this.copyOptimizedBtn.classList.remove('bg-green-600', 'hover:bg-green-500')
        this.copyOptimizedBtn.classList.add('bg-zinc-700', 'hover:bg-zinc-600')
      }, 2000)
      
    } catch (error) {
      console.error('Errore durante la copia:', error)
    }
  }

  showLoading() {
    this.hideAllStates()
    this.loadingState.classList.remove('hidden')
    this.analyzeBtn.disabled = true
    this.optimizeBtn.disabled = true
  }

  showInitialState() {
    this.hideAllStates()
    this.initialState.classList.remove('hidden')
    this.analyzeBtn.disabled = false
  }

  showAnalysisResults(result) {
    this.hideAllStates()
    this.analysisResults.classList.remove('hidden')
    
    // Populate explanation
    this.explanationContent.innerHTML = this.formatMarkdown(result.explanation)
    
    // Populate suggestions
    this.suggestionsContent.innerHTML = this.formatMarkdown(result.suggestions)
    
    this.analyzeBtn.disabled = false
  }

  showOptimizationResults(result) {
    this.optimizedResults.classList.remove('hidden')
    
    // Show optimized code
    this.optimizedCode.textContent = result.optimizedCode
    
    // Show optimization explanation
    this.optimizationExplanation.innerHTML = this.formatMarkdown(result.explanation)
    
    this.analyzeBtn.disabled = false
    this.optimizeBtn.disabled = false
  }

  showError(message) {
    this.hideAllStates()
    this.errorState.classList.remove('hidden')
    this.errorMessage.textContent = message
    this.analyzeBtn.disabled = false
    if (this.currentAnalysis) {
      this.optimizeBtn.disabled = false
    }
  }

  hideAllStates() {
    this.loadingState.classList.add('hidden')
    this.initialState.classList.add('hidden')
    this.analysisResults.classList.add('hidden')
    this.optimizedResults.classList.add('hidden')
    this.errorState.classList.add('hidden')
  }

  formatMarkdown(text) {
    if (!text) return ''
    
    // Simple markdown formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm"><code>$2</code></pre>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }
}

// Initialize playground when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CodePlayground()
})
