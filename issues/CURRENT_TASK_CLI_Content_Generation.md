# Current Task: Implement "Generate More Content" CLI Command

## Status: 🎯 Ready to Implement  
**Priority**: High  
**Estimated Time**: 4-6 hours  
**Created**: 2025-07-31  

---

## Current Gap Analysis ✅

### What's Already Complete:
- ✅ **Core CLI Framework**: Main menu, commands structure, prompts
- ✅ **Create Project**: Full automation with domain/subfolder validation
- ✅ **Rescrape Project**: Full automation with data updates  
- ✅ **Database Management**: Status, list, remove project, clear database
- ✅ **Processing Pipeline**: KeywordService with full processing
- ✅ **ProcessCommand**: Exists in `/cli/commands/process.js` but not connected

### What's Missing:
- ❌ **"Generate More Content" enabled in main menu** (currently disabled)
- ❌ **Content generation using existing processed data** (US-007)
- ❌ **Integration with existing ProcessCommand** or new WriteMoreCommand

---

## User Story to Implement

### US-007: Generate More Content (WRITEMORE)
**As a user, I want to generate additional FAQ titles from keyword clusters so that I can scale my content strategy.**

**Acceptance Criteria:**
- ✅ Use existing processed keyword data and clusters (no new SEMrush API calls)
- ✅ Generate FAQ-style titles from different clusters using OpenAI API
- ✅ Avoid duplicating previous titles in database
- ✅ Allow configurable titles per cluster (cost optimization)
- ✅ Smart cluster selection based on keyword volume and priority scores

**Interactive Flow:** Launch CLI, select "Generate More Content", select project from list, configure titles per cluster through prompts

---

## Implementation Plan

### Phase 1: Enable Menu Option (30 minutes)
```javascript
// Update /cli/index-new.js line 21:
// Change from: { title: 'Generate More Content (Coming Soon)', value: 'writemore', disabled: true },
// Change to:  { title: 'Generate More Content', value: 'writemore' },

// Add case handler for 'writemore'
```

### Phase 2: Create WriteMoreCommand (2-3 hours)
```javascript
// Create /cli/commands/writemore.js
class WriteMoreCommand {
  async execute() {
    // 1. Select existing project with processed data
    // 2. Show clusters and existing content counts  
    // 3. Allow user to select clusters for new content
    // 4. Configure titles per cluster
    // 5. Generate content using existing data
    // 6. Save new content to database
    // 7. Show generation summary
  }
}
```

### Phase 3: Content Generation Logic (2-3 hours)
```javascript
// Use the new FAQTitleGenerator:
const { FAQTitleGenerator } = require('../../src/generators/faq-title-generator');

// Database operations:
// 1. Query keyword_clusters table for available clusters
// 2. Query keywords table for cluster keywords (WHERE cluster_id = ?)
// 3. Query generated_content table to get existing titles (WHERE cluster_id = ? AND content_type = 'title')
// 4. Create processing_run (run_type = 'writemore')
// 5. Initialize FAQTitleGenerator with user-configured titles per cluster
// 6. Call generator.generateFAQTitles(cluster, existingTitles)
// 7. Insert generated titles into generated_content table with full metadata
// 8. Update processing_run with completion status
```

---

## Technical Specifications

### Data Flow:
```
User selects project → 
Load existing clusters and keywords → 
Show clusters with existing FAQ title counts →
User selects clusters for new FAQ generation →
User configures titles per cluster (cost control) →
Generate FAQ titles using OpenAI API based on cluster keywords →
Save to generated_content table (content_type = 'title') →
Show generation summary
```

### Key Components:
1. **Project Selection**: Reuse existing DatabasePrompts pattern
2. **Cluster Display**: Show clusters with existing content counts
3. **Content Generation**: Use existing content generation logic  
4. **Database Integration**: Use existing models and tables

### Database Tables Used:
- `projects` - Select existing project (✅ schema ready)
- `processing_runs` - Track writemore operations (run_type = 'writemore')
- `keyword_clusters` - Show available clusters with metadata (cluster_name, keyword_count, business_value_score)
- `keywords` - Source data for content generation (cluster_id, intent, priority_score)
- `generated_content` - Save FAQ titles (content_type = 'title', cluster_id, ai_model, quality_score)

---

## Success Criteria

**Minimum Viable Product:**
- [ ] "Generate More Content" option enabled in main menu
- [ ] Can select from existing projects with processed clusters
- [ ] Shows clusters with current FAQ title counts (COUNT from generated_content WHERE content_type = 'title')
- [ ] Can select specific clusters for new FAQ title generation
- [ ] User can configure number of titles per cluster (cost control)
- [ ] Generates FAQ titles using OpenAI API based on cluster keywords
- [ ] Avoids duplicating existing titles in database
- [ ] Saves to generated_content table with content_type = 'title'
- [ ] Shows generation summary with counts

**Enhanced Features** (if time permits):
- [ ] Content quality preview before saving
- [ ] Batch generation settings (titles per cluster)
- [ ] Content template selection
- [ ] Export generated content to CSV

---

## Implementation Details

### File Changes Required:
1. **`/cli/index-new.js`** - Enable writemore menu option
2. **`/cli/commands/writemore.js`** - New command file (create from scratch)
3. **Test integration** - Ensure works with existing database

### Reuse Existing Patterns:
- **Command Structure**: Follow CreateCommand/RescrapeCommand pattern
- **Prompts**: Use existing prompts from DatabasePrompts
- **Output**: Use existing Output utility for user feedback
- **Database Models**: Use existing ProjectModel, ClusterModel, etc.

### FAQ Title Generation Strategy:
- **Generator Class**: `FAQTitleGenerator` in `/src/generators/faq-title-generator.js` (✅ implemented)
- **Input**: Cluster object with keywords array and cluster name/theme
- **AI Integration**: Uses existing `chatgptStructuredArray` function with structured schema
- **Deduplication**: Automatic similarity checking against existing titles
- **Validation**: Ensures titles are FAQ-format and appropriate length
- **Output**: FAQ-style questions/titles (e.g., "How to...", "What is...", "Best practices for...")
- **Cost Control**: User-configurable titles per cluster (default: 5 per cluster)
- **Example**: Cluster "Trading Strategies" → "How to Start Crypto Trading for Beginners?"

---

## Testing Strategy

### Manual Testing:
1. Run `npm start`
2. Select "Generate More Content" 
3. Choose existing project with processed data
4. Select clusters for new content
5. Configure generation settings
6. Verify content generated and saved
7. Check no duplicate titles created

### Edge Cases:
- Project with no processed data
- Project with no clusters
- All clusters already have maximum content
- Database connection issues

---

## Dependencies

### Required:
- Existing project with processed keywords and clusters
- Database connection working
- ✅ FAQTitleGenerator class (implemented in `/src/generators/faq-title-generator.js`)
- Existing `chatgptStructuredArray` function in `/src/chatgpt.js`

### External APIs:
- **Required**: OpenAI API for FAQ title generation (per PRODUCT_REQUIREMENTS.md)
- **Not Required**: No SEMrush API calls needed (uses existing data)
- **Environment Variable**: OPENAI_API_KEY must be configured

---

## Architecture Notes

### Design Decisions:
- **Reuse existing data**: No new API calls, work with processed keywords
- **Incremental generation**: Add to existing content, don't replace
- **User control**: Let user select which clusters to generate for
- **Fast execution**: No external API dependencies for basic functionality

### Performance Considerations:
- Load only necessary data (selected project/clusters)
- Generate content in batches if large clusters
- Show progress for longer operations
- Efficient database queries

---

## Next Steps After Completion

Once Generate More Content is implemented:
1. **Cross-Project Analysis** - Implement the other "Coming Soon" feature
2. **Content Export** - Add export functionality for generated content
3. **Content Quality Scoring** - Add quality metrics to generated content
4. **Template Management** - Allow custom content templates

---

## Current Priority: IMPLEMENT WRITEMORE COMMAND

This represents the main missing CLI functionality from the user stories. All infrastructure is in place - just need to create the command and connect it to the existing processing pipeline.

**Ready to start coding immediately** ✅

### Implementation Order:
1. Enable menu option (quick win)
2. Create basic WriteMoreCommand structure  
3. Add project/cluster selection logic
4. Implement content generation logic
5. Test with real data
6. Polish user experience