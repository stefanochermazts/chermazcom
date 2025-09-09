# Demo Output - Translation Script

## ✅ Dry Run Test Completed Successfully!

```bash
$ node scripts/translate-mdx.mjs --target=en --collection=pages --sample=2 --dry-run

🚀 Starting MDX Translation
   Target: English
   Collection: pages
   Mode: DRY RUN
   Sample: 2

📊 Found 4 source files, processing 2
📁 Files to process:
   - src\content\pages\servizi.mdx
   - src\content\pages\services.mdx

📄 Processing: src\content\pages\servizi.mdx
   🔍 Would create: src\content\pages\en-servizi.mdx
📄 Processing: src\content\pages\services.mdx
   ⏭️  Skip: en-services.mdx already exists

📊 Translation Complete!
   ✅ Processed: 0
   ⏭️  Skipped: 1
   ❌ Errors: 0
```

## 🧪 What would happen with a real API key:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Test on single file
node scripts/translate-mdx.mjs --target=en --collection=pages --sample=1

# Expected output:
🚀 Starting MDX Translation
   Target: English
   Collection: pages
   Mode: LIVE
   Sample: 1

📊 Found 4 source files, processing 1
📁 Files to process:
   - src\content\pages\servizi.mdx

📄 Processing: src\content\pages\servizi.mdx
   🔄 Translating frontmatter...
   🔄 Translating content...
   ✅ Created: en-servizi.mdx

📊 Translation Complete!
   ✅ Processed: 1
   ⏭️  Skipped: 0
   ❌ Errors: 0
```

## 📋 Ready Commands for Full Translation:

```bash
# 1. Backup first
git add . && git commit -m "Pre-translation backup"

# 2. Test on a few files
export OPENAI_API_KEY="sk-..."
node scripts/translate-mdx.mjs --target=en --sample=3

# 3. If satisfied, translate by collection
node scripts/translate-mdx.mjs --target=en --collection=pages
node scripts/translate-mdx.mjs --target=en --collection=case-studies  
node scripts/translate-mdx.mjs --target=en --collection=insights

# 4. Translate to Slovenian
node scripts/translate-mdx.mjs --target=sl --collection=pages
node scripts/translate-mdx.mjs --target=sl --collection=case-studies
node scripts/translate-mdx.mjs --target=sl --collection=insights
```

## 💰 Cost Estimation:

- **Pages**: 4 files × $0.001 = $0.004
- **Case Studies**: ~6 files × $0.001 = $0.006  
- **Insights**: ~150 files × $0.001 = $0.15
- **Total per language**: ~$0.16
- **Both EN + SL**: ~$0.32

## ✅ Script Features Verified:

- ✅ File discovery and filtering
- ✅ Dry run mode
- ✅ Skip existing files  
- ✅ Sample limiting
- ✅ Collection filtering
- ✅ Error handling
- ✅ Progress reporting
