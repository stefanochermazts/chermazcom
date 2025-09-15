/**
 * Ask Stefano Chat Widget
 * Interactive chat functionality
 */

class AskStefanoChat {
  constructor() {
    this.isOpen = false;
    this.sessionId = this.generateSessionId();
    this.apiBase = window.location.origin;
    this.currentLanguage = this.detectLanguage();
    
    this.initializeElements();
    this.bindEvents();
    this.setupAutoResize();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  detectLanguage() {
    const path = window.location.pathname;
    if (path.startsWith('/en/')) return 'en';
    if (path.startsWith('/sl/')) return 'sl';
    return 'it';
  }

  initializeElements() {
    this.widget = document.getElementById('ask-stefano-widget');
    this.toggleButton = document.getElementById('chat-toggle');
    this.chatPanel = document.getElementById('chat-panel');
    this.closeButton = document.getElementById('chat-close');
    this.messagesContainer = document.getElementById('chat-messages');
    this.inputArea = document.querySelector('.chat-input-area');
    this.chatInput = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
    this.charCount = document.querySelector('.char-count');
    this.quickActions = document.querySelectorAll('.quick-action');
  }

  bindEvents() {
    // Toggle chat
    this.toggleButton?.addEventListener('click', () => this.toggleChat());
    this.closeButton?.addEventListener('click', () => this.closeChat());
    
    // Send message
    this.sendButton?.addEventListener('click', () => this.sendMessage());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Input validation
    this.chatInput?.addEventListener('input', () => this.updateInputState());

    // Quick actions
    this.quickActions?.forEach(button => {
      button.addEventListener('click', () => {
        const query = button.dataset.query;
        if (query) {
          this.chatInput.value = query;
          this.updateInputState();
          this.sendMessage();
        }
      });
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeChat();
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.widget?.contains(e.target)) {
        this.closeChat();
      }
    });
  }

  setupAutoResize() {
    if (!this.chatInput) return;
    
    this.chatInput.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
    });
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.chatPanel?.classList.remove('hidden');
    this.chatInput?.focus();
    
    // Track analytics
    this.trackEvent('chat_opened');
  }

  closeChat() {
    this.isOpen = false;
    this.chatPanel?.classList.add('hidden');
    
    // Track analytics
    this.trackEvent('chat_closed');
  }

  updateInputState() {
    if (!this.chatInput || !this.sendButton || !this.charCount) return;

    const text = this.chatInput.value.trim();
    const length = this.chatInput.value.length;
    
    // Update character count
    this.charCount.textContent = `${length}/500`;
    
    // Enable/disable send button
    this.sendButton.disabled = text.length === 0;
    
    // Update character count color
    if (length > 450) {
      this.charCount.style.color = '#ef4444';
    } else if (length > 400) {
      this.charCount.style.color = '#f59e0b';
    } else {
      this.charCount.style.color = '#64748b';
    }
  }

  async sendMessage() {
    const query = this.chatInput?.value?.trim();
    if (!query) return;

    // Clear input
    this.chatInput.value = '';
    this.updateInputState();

    // Add user message
    this.addMessage(query, 'user');

    // Add loading message
    const loadingId = this.addLoadingMessage();

    try {
      // Send to API
      const response = await this.callAskAPI(query);
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Add assistant response
      this.addMessage(response.response, 'assistant', response.sources);
      
      // Track successful query
      this.trackEvent('message_sent', {
        language: response.language,
        confidence: response.confidence,
        citationCount: response.citationCount
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove loading message
      this.removeMessage(loadingId);
      
      // Add error message
      const errorMessage = this.getErrorMessage();
      this.addMessage(errorMessage, 'assistant');
      
      // Track error
      this.trackEvent('message_error', { error: error.message });
    }
  }

  addMessage(content, type, sources = null) {
    if (!this.messagesContainer) return null;

    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.id = messageId;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (type === 'assistant') {
      contentDiv.innerHTML = this.formatAssistantMessage(content, sources);
    } else {
      contentDiv.textContent = content;
    }

    messageDiv.appendChild(contentDiv);

    // Add feedback buttons for assistant messages
    if (type === 'assistant' && sources) {
      const feedbackDiv = this.createFeedbackButtons(messageId);
      messageDiv.appendChild(feedbackDiv);
    }

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    return messageId;
  }

  addLoadingMessage() {
    if (!this.messagesContainer) return null;

    const messageId = 'loading_' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = messageId;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content loading';
    contentDiv.textContent = 'Sto pensando...';

    messageDiv.appendChild(contentDiv);
    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();

    return messageId;
  }

  removeMessage(messageId) {
    if (!messageId) return;
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.remove();
    }
  }

  formatAssistantMessage(content, sources) {
    let html = this.parseMarkdown(content);
    
    // Add sources if available
    if (sources && sources.length > 0) {
      html += '<div class="message-sources">';
      html += '<h4>📚 Fonti:</h4>';
      html += '<ul>';
      sources.forEach(source => {
        html += `<li><a href="${source.url}" target="_blank" rel="noopener">${source.title}</a></li>`;
      });
      html += '</ul>';
      html += '</div>';
    }

    return html;
  }

  parseMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/, '<p>$1</p>');
  }

  createFeedbackButtons(messageId) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'message-feedback';
    feedbackDiv.innerHTML = `
      <div class="feedback-buttons">
        <button class="feedback-btn positive" data-message-id="${messageId}" data-feedback="positive" title="Risposta utile">
          👍
        </button>
        <button class="feedback-btn negative" data-message-id="${messageId}" data-feedback="negative" title="Risposta non utile">
          👎
        </button>
      </div>
    `;

    // Add click handlers
    feedbackDiv.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.submitFeedback(e.target));
    });

    return feedbackDiv;
  }

  async submitFeedback(button) {
    const messageId = button.dataset.messageId;
    const feedback = button.dataset.feedback;
    
    try {
      await this.callFeedbackAPI(messageId, feedback);
      
      // Update UI
      const feedbackDiv = button.closest('.message-feedback');
      feedbackDiv.innerHTML = '<span class="feedback-thanks">Grazie per il feedback!</span>';
      
      this.trackEvent('feedback_submitted', { feedback });
      
    } catch (error) {
      console.error('Feedback error:', error);
    }
  }

  async callAskAPI(query) {
    const response = await fetch(`${this.apiBase}/.netlify/functions/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        language: this.currentLanguage,
        sessionId: this.sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  }

  async callFeedbackAPI(messageId, feedback) {
    const response = await fetch(`${this.apiBase}/.netlify/functions/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId: messageId,
        sessionId: this.sessionId,
        feedback: feedback
      })
    });

    if (!response.ok) {
      throw new Error(`Feedback API Error: ${response.status}`);
    }

    return await response.json();
  }

  getErrorMessage() {
    const messages = {
      it: 'Mi dispiace, si è verificato un errore. Riprova più tardi o contatta il supporto.',
      en: 'Sorry, an error occurred. Please try again later or contact support.',
      sl: 'Oprostite, prišlo je do napake. Poskusite znova pozneje ali se obrnite na podporo.'
    };
    
    return messages[this.currentLanguage] || messages.it;
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  trackEvent(event, data = {}) {
    // Simple analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', event, {
        event_category: 'ask_stefano',
        ...data
      });
    }
    
    console.log('Ask Stefano Event:', event, data);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ask-stefano-widget')) {
    window.askStefanoChat = new AskStefanoChat();
  }
});

// Additional CSS for feedback and sources
const additionalStyles = `
  .message-feedback {
    margin-top: 8px;
    text-align: right;
  }

  .feedback-buttons {
    display: inline-flex;
    gap: 4px;
  }

  .feedback-btn {
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .feedback-btn:hover {
    background: #f1f5f9;
    transform: scale(1.1);
  }

  .feedback-btn.positive:hover {
    background: #dcfce7;
    border-color: #16a34a;
  }

  .feedback-btn.negative:hover {
    background: #fef2f2;
    border-color: #dc2626;
  }

  .feedback-thanks {
    color: #16a34a;
    font-size: 12px;
    font-style: italic;
  }

  .message-sources {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }

  .message-sources h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #475569;
  }

  .message-sources ul {
    margin: 0;
    padding-left: 16px;
  }

  .message-sources li {
    margin-bottom: 4px;
  }

  .message-sources a {
    color: #667eea;
    text-decoration: none;
    font-size: 12px;
  }

  .message-sources a:hover {
    text-decoration: underline;
  }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
