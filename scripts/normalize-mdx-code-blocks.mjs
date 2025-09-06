#!/usr/bin/env node
/**
 * Normalizza i file MDX convertendo indicatori di linguaggio non recintati
 * (es. "python", "java") in fence code validi (```python ... ```),
 * correggendo fence mal formati e assicurando che tutti i blocchi siano chiusi.
 */

import { promises as fs } from 'fs';
import path from 'path';

const CONTENT_ROOT = path.resolve(process.cwd(), 'src', 'content');

const LANGUAGE_TOKENS = [
  'python', 'java', 'bash', 'shell', 'sh', 'javascript', 'js', 'ts', 'typescript',
  'json', 'yaml', 'yml', 'html', 'css', 'sql', 'powershell', 'csharp', 'c#', 'go', 'rust', 'php'
];

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mdx')) {
      yield fullPath;
    }
  }
}

function normalizeCodeFences(input) {
  let text = input.replace(/\r\n?/g, '\n');

  // 1) Normalizza "``` lang" -> "```lang"
  text = text.replace(/```\s+([a-zA-Z0-9#+-]+)/g, '```$1');

  // 2) Converte linee isolate con solo il nome del linguaggio in apertura fence
  //    Esempio: "\npython\n" -> "\n```python\n"
  const langAlternation = LANGUAGE_TOKENS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const standaloneLangRe = new RegExp(`(^|\n)[\t ]*(${langAlternation})[\t ]*\n`, 'g');
  text = text.replace(standaloneLangRe, (m, p1, lang) => `${p1}\
\`\`\`${lang}\n`);

  // 3) Converte linee che iniziano con "<lang> <codice>" in apertura fence con la parte restante come prima riga di codice
  //    Esempio: "java public class X {" -> "```java\npublic class X {"
  const inlineLangStartRe = new RegExp(`(^|\n)[\t ]*(${langAlternation})[\t ]+([^\n\r]+)\n`, 'g');
  text = text.replace(inlineLangStartRe, (m, p1, lang, rest) => `${p1}\
\`\`\`${lang}\n${rest}\n`);

  // 4) Assicura che i fence siano chiusi (numero di ``` pari). Se dispari, aggiunge un fence di chiusura alla fine.
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 === 1) {
    text = text.trimEnd() + '\n```\n';
  }

  return text;
}

async function processFile(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  const normalized = normalizeCodeFences(original);
  if (normalized !== original) {
    await fs.writeFile(filePath, normalized, 'utf8');
    return { filePath, changed: true };
  }
  return { filePath, changed: false };
}

async function main() {
  const results = [];
  for await (const filePath of walk(CONTENT_ROOT)) {
    // Salta eventuali file generati o bozza se necessario (nessun filtro aggiuntivo ora)
    const res = await processFile(filePath);
    results.push(res);
  }

  const changed = results.filter(r => r.changed).length;
  const total = results.length;
  console.log(`[normalize-mdx] Processati ${total} file MDX; modificati ${changed}.`);
  if (changed > 0) {
    for (const r of results.filter(r => r.changed)) {
      console.log(` - Fix: ${path.relative(process.cwd(), r.filePath)}`);
    }
  }
}

main().catch((err) => {
  console.error('[normalize-mdx] Errore:', err);
  process.exit(1);
});


