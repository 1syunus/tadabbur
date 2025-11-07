# Development Log

> **Note to Contributors:** This document is maintained by the primary developer for tracking architectural rationale, time estimates, and resume context. It is not required reading for general contributions.

> This document tracks real-time progress, decisions, challenges, and metrics during development.  

> **Purpose**: Raw notes for compiling final README and resume bullets.

---
...

## Project Initialization - 2025-11-05

### Completed Tasks

- [x] Created GitHub repository with MIT license
- [x] Added issue templates (feature, bug, optimization)
- [x] Wrote comprehensive README with architecture decisions
- [x] Set up security policy (SECURITY.md)
- [x] Created .env.example for secrets management
- [x] Initialized development log

### Next Steps

1. Initialize Next.js project with TypeScript
2. Set up Supabase project and local development
3. Design database schema
4. Create initial migrations

---

## Framework & Infrastructure Setup - 2025-11-06

### Completed Tasks
- [x] Initialized Next.js project with fixed TypeScript (ESM) configuration.
- [x] Installed core dependencies (@supabase/supabase-js, zod, Next.js).
- [x] Documented Contract-Driven Design (CDD) philosophy in README.
- [x] Initialized Supabase CLI and project folder structure.

### Next Steps
1. Design database schema, including RLS policies.
2. Generate TypeScript types from schema (Contract-First).
3. Create initial database migrations and push to local DB.

---

## Phase 2: Data Contract Design & Feature Lock - 2025-11-06

### Completed Tasks
- [x] Defined and finalized **9-Entity Normalized Schema** (ERD).
- [x] Formalized detailed **Feature Specifications** (Chat memory, Notebook hierarchy, Soft Delete).
- [x] Finalized **AI Constraint Contract** (System Prompt requirements, moral/theological guardrails).
- [x] Created `docs/` folder and committed **`erd.md`** and **`feature_specs.md`**.
- [x] Created the SQL migration file (`init_normalized_app_schema`).

### Next Steps
1. Execute the SQL migration (`npx supabase db push`) to deploy the schema locally.
2. Generate TypeScript types (`supabase gen types`) from the new schema contract.
3. Begin Phase 3: Implement the Data Service layer (Supabase client/Next.js API routes).

---

## Phase 2: Data Contract Implementation - 2025-11-07

### Completed Tasks
- [x] Defined and finalized **9-Entity Normalized Schema** (ERD)
- [x] Formalized detailed **Feature Specifications** (Chat memory, Notebook hierarchy, Soft Delete)
- [x] Finalized **AI Constraint Contract** (System Prompt requirements, moral/theological guardrails)
- [x] Created `docs/` folder and committed **`ERD.md`** and **`FEATURE_SPECS.md`**
- [x] Created SQL migration file (`20241106HHMMSS_initial_schema.sql`)
- [x] **Security hardening:** Fixed RLS policies with explicit `WITH CHECK` clauses
- [x] **Security hardening:** Added dual ownership checks for join tables (conversation_tags, note_page_tags)
- [x] **Multilingual support:** Changed full-text search from 'english' to 'simple' config for Arabic/English mixed content
- [x] Removed unnecessary `uuid-ossp` extension (using built-in `gen_random_uuid()`)
- [x] Added explicit type casting for JSONB/array defaults

### Next Steps
1. Execute the SQL migration (`npx supabase db push`) to deploy schema to cloud
2. Generate TypeScript types (`supabase gen types typescript --linked > types/supabase.ts`)
3. Commit generated types
4. Begin Phase 3: External API Integration (Quran Foundation API client)

---

## Technical Decisions Log

### Decision 1: Supabase vs Firebase vs Custom Backend
- **Date**: 2025-11-05
- **Decision**: Supabase
- **Rationale**:
  - Postgres (familiar, powerful queries)
  - Built-in RLS (database-enforced security)
  - Open source (can self-host later)
  - Great TypeScript support
- **Tradeoff**: Less mature than Firebase, smaller ecosystem

### Decision 2: Contract-Driven Design & ESM Config Fix
- **Date**: 2025-11-06
- **Decision**: Adopt Contract-Driven Design and update TypeScript/Next.js ESM configuration
- **Rationale**:
  - Made a new architectural choice (Contract-Driven Design over immediate TDD)
  - Applied a key technical fix to enable `export` syntax in modules
  - Critical to log these decisions to maintain clarity and track reasoning over time
- **Tradeoff**: Delaying some unit tests in favor of establishing a stable data contract first

### Decision 3: Data Schema Normalization
- **Date**: 2025-11-06
- **Decision**: Adopt a 9-Entity Normalized Schema over the initial simple reflections table
- **Rationale**:
  - The full feature set (Chat memory, Tags, Sections, AI Insights) required normalized tables
  - Separation of entities (e.g., tags via junction tables) improves data integrity and scalability
  - Enables efficient querying and simplifies application-level logic
- **Tradeoff**: Increased database complexity (more tables and joins) but significantly improved filtering performance and maintainability

### Decision 4: Rich Text Format
- **Date**: 2025-11-06
- **Decision**: Use Markdown for `note_pages.content` storage
- **Rationale**:
  - Markdown is secure, lightweight, and portable
  - Avoids security and complexity risks tied to storing raw HTML (from WYSIWYG editors)
  - Aligns with portability and simplicity goals of the platform
- **Tradeoff**: Requires a client-side Markdown editor and renderer

### Decision 5: AI Pattern Recognition Cadence
- **Date**: 2025-11-06
- **Decision**: Batch Processing (Weekly/Nightly Cron Job) for AI Pattern Recognition
- **Rationale**:
  - Adheres to the “free tier” constraint by avoiding real-time LLM calls
  - Offloads heavy processing to a background task, reducing API costs and improving UX responsiveness
  - Allows consistent, periodic generation of insights
- **Tradeoff**: Insights are not real-time (may be up to 7 days old)

### Decision 6: TEXT + CHECK vs PostgreSQL ENUM
- **Date**: 2025-11-06
- **Decision**: Use TEXT with CHECK constraints instead of ENUMs for role/type columns
- **Rationale**:
  - Easier schema evolution (adding values doesn't require type recreation)
  - Simpler migrations for early-stage app
  - Better DX for developers unfamiliar with PostgreSQL ENUMs
  - TypeScript generation produces identical types
- **Tradeoff**: Slightly larger storage (TEXT vs 2-4 byte ENUM), but negligible at our scale

### Decision 7: Multilingual Full-Text Search
- **Date**: 2025-11-06
- **Decision**: Use `to_tsvector('simple', content)` instead of `to_tsvector('english', content)`
- **Rationale**:
  - App will have mixed Arabic/English content (especially in AI responses citing Qur'an)
  - 'simple' config works for all languages without language-specific tokenization
  - Avoids need for multiple language-specific indexes
- **Tradeoff**: No stemming or stop-word removal, but acceptable for multilingual search

### Decision 8: Array vs Junction Table for AI Insights
- **Date**: 2025-11-06
- **Decision**: Use UUID[] arrays for `ai_insights.related_note_pages` instead of junction table
- **Rationale**:
  - Read-heavy use case (insights generated periodically, read often)
  - Small lists expected (<50 notes per insight typically)
  - Simpler schema and queries
  - PostgreSQL handles arrays efficiently with GIN indexes
- **Tradeoff**: Violates 1NF (intentional denormalization), may refactor to junction table if bidirectional queries needed

---

## Challenges & Solutions

#### Challenge 1: Failed Next.js Scaffolding & Pathing Errors
- **Date**: 2025-11-06
- **Problem**: The `npx create-next-app` failed due to the presence of foundational files (e.g., `README.md`). Subsequent `npx` commands (like `tailwindcss init -p`) failed in the PowerShell environment due to missing executables/symlinks, despite dependencies being installed.
- **Impact**: Added +1.5 hours of unexpected debugging time and forced a change from the streamlined scaffold process.
- **Attempted Solutions**: 
  1. `npx create-next-app ...` - Failed due to non-empty directory.
  2. Manual `npm install` - Led to further `npx` pathing errors in the terminal.
- **Final Solution**: Switched to a fully manual installation and configuration process, explicitly defining npm run scripts in `package.json` (e.g., `tailwind:init`) to bypass faulty system pathing. This proved more robust.
- **Code Changes**: See commit `chore(infra): Setup Next.js, fix TS/ESM...`
- **Learning**: Do not rely on scaffold tools in non-empty directories. Always use defined npm scripts for cross-platform reliability when working with local CLIs (like Tailwind) on Windows/PowerShell.

---

### Challenge 2: RLS Policy Security Holes in Join Tables
- **Date**: 2025-11-07
- **Problem**: Initial RLS policies on `conversation_tags` and `note_page_tags` only checked ownership of the parent resource (conversation/note_page) but not the tag itself, allowing potential cross-user tag reference attacks
- **Impact**: Security vulnerability where malicious users could reference tags owned by other users
- **Attempted Solutions**:
  1. Single `FOR ALL` policy with `USING` clause - insufficient, doesn't validate INSERT
  2. Split policies but only checking parent ownership - still vulnerable
- **Final Solution**: Split policies into SELECT/INSERT/UPDATE/DELETE with compound `EXISTS` checks validating BOTH parent resource ownership AND tag ownership:
```sql
  CREATE POLICY "users_insert_own_conversation_tags"
    ON conversation_tags FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM tags WHERE id = tag_id AND user_id = auth.uid())
    );
```
- **Code Changes**: Migration file updated with secure RLS policies
- **Learning**: Always validate ALL foreign keys in join tables point to user-owned resources. Never use `FOR ALL` policies - always split into explicit operation-specific policies with `WITH CHECK` clauses.

---

### Challenge 3: Multilingual Text Search Configuration
- **Date**: 2025-11-07
- **Problem**: Default English full-text search configuration wouldn't properly tokenize Arabic text in note_pages.content
- **Impact**: Users wouldn't be able to search Arabic words in their notes, breaking core functionality for mixed-language content
- **Attempted Solutions**:
  1. Multiple language-specific indexes (one for English, one for Arabic) - complex, requires knowing language per search
  2. Application-level search with AI embeddings - too complex for MVP
- **Final Solution**: Use PostgreSQL 'simple' text search configuration which provides language-agnostic tokenization:
```sql
  CREATE INDEX idx_note_pages_multilingual 
    ON note_pages USING GIN (to_tsvector('simple', content));
```
- **Code Changes**: Updated index creation in migration
- **Learning**: For multilingual applications, 'simple' text search config provides adequate search without language detection complexity. Consider AI embeddings (pgvector) for semantic search in V2.

---

### Template for Future Entries:

#### Challenge X: [Title]
- **Date**: 
- **Problem**: [Detailed description]
- **Impact**: [How does this affect the project?]
- **Attempted Solutions**: 
  1. [First attempt] - [Result]
  2. [Second attempt] - [Result]
- **Final Solution**: [What worked]
- **Code Changes**: [Commit hash or PR link]
- **Learning**: [What did you learn?]


---

## Performance Metrics

[Update as features are built and benchmarked]

### Search Feature
| Metric | Target | Actual | Date Measured | Notes |
|--------|--------|--------|---------------|-------|
| Cold start latency | <2s | TBD | - | - |
| Warm cache latency | <0.5s | TBD | - | - |
| Cache hit rate | >60% | TBD | - | - |
| API error rate | <1% | TBD | - | - |

### AI Integration
| Metric | Target | Actual | Date Measured | Notes |
|--------|--------|--------|---------------|-------|
| Keyword extraction accuracy | >85% | TBD | - | Manual testing, n=50 |
| Prompt generation quality | >4/5 | TBD | - | User survey |
| Rate limit violations | <2% | TBD | - | - |

---

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Project setup | 2h | 1.5 | Repo, docs, infrastructure |
| Framework Init | 1h	| 2.5h | Infrastructure setup, fixing scaffold errors (see challenges) |
| ERD Design | 1h | 2h | Initial design + iteration on relationships |
| Feature Specs | 1h | 1.5h | Documenting requirements and AI constraints |
| Database Schema | 2h | 3h | Writing migration + security hardening |
| RLS Security Review | 0.5h | 1h | Identifying and fixing join table vulnerabilities |
| API integration | 4h | TBD | Quran Foundation API client |
| Semantic search | 6h | TBD | AI keyword extraction + caching |
| Reflection CRUD | 4h | TBD | User data management |
| Auth integration | 2h | TBD | Supabase Auth setup |
| Rate limiting | 3h | TBD | Redis + sliding window algorithm |
| UI development | 8h | TBD | Components, styling, responsiveness |

---

## Screenshots & Demos

[Add as features are completed]

### Placeholder:
- [ ] Search interface (before/after AI)
- [ ] Reflection journal UI
- [ ] AI prompt generation demo
- [ ] Mobile responsiveness

---

## Code Quality Metrics

[Track as project grows]

| Metric | Target | Actual | Date |
|--------|--------|--------|------|
| TypeScript strict mode | 100% | TBD | - |
| Test coverage | >80% | TBD | - |
| Lighthouse score | >90 | TBD | - |
| Bundle size (FCP) | <250KB | TBD | - |
| Lines of code | - | TBD | - |
| Database Tables | 9 | 2025-11-07 |
| RLS Policies | 32 | 2025-11-07 |
| Indexes | 20 | 2025-11-07 |
| Foreign Key Relationships | 11 | 2025-11-07 |
| Security Issues Found | 2 (fixed) | 2025-11-07 |

---

## Dependencies Added

[Track as packages are installed]


| Package | Version | Purpose | Date Added |
|---------|---------|---------|------------|
| @supabase/supabase-js | ^2.x | Database client | 2025-11-06 |
| next | ^16.x | Frontend/Backend framework | 2025-11-06 |
| react, react-dom | ^19.x | UI Library | 2025-11-06 |
| zod | ^4.x | Runtime validation (Contracts-First) | 2025-11-06 |
| typescript | ^5.x | Language/Compiler | 2025-11-06 |
| tailwindcss | ^3.x | Styling utility | 2025-11-06 |

---

## Git Workflow Notes

### Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates
- `setup/` - Initial setup tasks

### Commit Message Format
```
type(scope): subject

body (optional - explain WHY, not WHAT)

footer (optional - issue references, breaking changes)
```

Types: feat, fix, chore, docs, style, refactor, test, perf

---

**Last Updated**: 2025-11-06