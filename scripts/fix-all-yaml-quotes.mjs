#!/usr/bin/env node

import fs from 'fs'
import { glob } from 'glob'

console.log('🔧 Final fix for ALL YAML quote issues...')

const files = glob.sync('src/content/**/*.mdx')
let fixedCount = 0

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Split into frontmatter and body
    const parts = content.split('---')
    if (parts.length >= 3) {
      let frontmatter = parts[1]
      const originalFrontmatter = frontmatter
      
      // Fix 1: Mixed quotes (starts with " ends with ')
      frontmatter = frontmatter.replace(
        /(title|excerpt|description):\s*"([^"]*)'$/gm, 
        (match, field, value) => `${field}: "${value}"`
      )
      
      // Fix 2: Mixed quotes (starts with ' ends with ")
      frontmatter = frontmatter.replace(
        /(title|excerpt|description):\s*'([^']*)"$/gm, 
        (match, field, value) => `${field}: '${value}'`
      )
      
      // Fix 3: Unmatched quotes at end of line
      frontmatter = frontmatter.replace(
        /(title|excerpt|description):\s*"([^"]*)'([^"]*)$/gm,
        (match, field, value1, value2) => `${field}: "${value1}'${value2}"`
      )
      
      // Fix 4: Replace any remaining cos"è with cos'è
      frontmatter = frontmatter.replace(/cos"è/g, "cos'è")
      
      if (frontmatter !== originalFrontmatter) {
        parts[1] = frontmatter
        content = parts.join('---')
        
        fs.writeFileSync(file, content, 'utf-8')
        console.log(`✅ Fixed: ${file}`)
        fixedCount++
      }
    }
    
    // Also fix import statements with wrong quotes
    const beforeImports = content
    content = content.replace(/from '([^']*)"/, "from '$1'")
    content = content.replace(/from "([^"]*)'/, 'from "$1"')
    
    if (content !== beforeImports) {
      fs.writeFileSync(file, content, 'utf-8')
      if (!fixedCount) console.log(`✅ Fixed imports: ${file}`)
      fixedCount++
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`)
  }
}

console.log(`📊 Fixed ${fixedCount} files`)
console.log('✅ All YAML quote issues should now be resolved!')
