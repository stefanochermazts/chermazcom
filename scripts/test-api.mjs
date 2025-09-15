#!/usr/bin/env node

import fetch from 'node-fetch'

const API_BASE = process.env.API_BASE || 'http://localhost:4321/.netlify/functions'

/**
 * Test API endpoint
 */
async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`)
  console.log(`   URL: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    
    const data = await response.text()
    let jsonData
    
    try {
      jsonData = JSON.parse(data)
    } catch {
      jsonData = { raw: data }
    }
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Response:`, JSON.stringify(jsonData, null, 2).substring(0, 500))
    
    if (response.ok) {
      console.log(`   ✅ ${name} OK`)
      return { success: true, data: jsonData }
    } else {
      console.log(`   ❌ ${name} FAILED`)
      return { success: false, error: jsonData }
    }
    
  } catch (error) {
    console.log(`   ❌ ${name} ERROR: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Main test function
 */
async function testAPI() {
  console.log('🚀 Ask Stefano API Test Suite')
  console.log(`📍 API Base URL: ${API_BASE}`)
  console.log('=' .repeat(60))
  
  const results = []
  
  // Test 1: Health Check
  const healthResult = await testEndpoint(
    'Health Check',
    `${API_BASE}/health`
  )
  results.push({ name: 'Health Check', ...healthResult })
  
  // Test 2: Ask Endpoint - Italian Question
  const askResult1 = await testEndpoint(
    'Ask API (Italian)',
    `${API_BASE}/ask`,
    {
      method: 'POST',
      body: JSON.stringify({
        query: 'Come posso creare un chatbot?',
        sessionId: 'test-session-1'
      })
    }
  )
  results.push({ name: 'Ask API (Italian)', ...askResult1 })
  
  // Test 3: Ask Endpoint - English Question  
  const askResult2 = await testEndpoint(
    'Ask API (English)',
    `${API_BASE}/ask`,
    {
      method: 'POST',
      body: JSON.stringify({
        query: 'What is SharePoint?',
        language: 'en',
        sessionId: 'test-session-2'
      })
    }
  )
  results.push({ name: 'Ask API (English)', ...askResult2 })
  
  // Test 4: Ask Endpoint - Empty Query (should fail)
  const askResult3 = await testEndpoint(
    'Ask API (Empty Query)',
    `${API_BASE}/ask`,
    {
      method: 'POST',
      body: JSON.stringify({
        query: '',
        sessionId: 'test-session-3'
      })
    }
  )
  results.push({ name: 'Ask API (Validation)', ...askResult3 })
  
  // Test 5: Feedback Endpoint
  const feedbackResult = await testEndpoint(
    'Feedback API',
    `${API_BASE}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify({
        messageId: 'msg-123',
        sessionId: 'test-session-1',
        feedback: 'positive',
        comment: 'Great response!'
      })
    }
  )
  results.push({ name: 'Feedback API', ...feedbackResult })
  
  // Test 6: Method Not Allowed
  const methodResult = await testEndpoint(
    'Method Not Allowed Test',
    `${API_BASE}/ask`,
    {
      method: 'GET'
    }
  )
  results.push({ name: 'Method Validation', ...methodResult })
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(60))
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
  })
  
  console.log('')
  console.log(`📈 Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed! API is ready for production.')
  } else {
    console.log('⚠️  Some tests failed. Check the logs above.')
  }
  
  console.log('')
  console.log('🔗 API Endpoints:')
  console.log(`   Health: GET ${API_BASE}/health`)
  console.log(`   Ask: POST ${API_BASE}/ask`)
  console.log(`   Feedback: POST ${API_BASE}/feedback`)
}

// Run tests
testAPI().catch(console.error)
