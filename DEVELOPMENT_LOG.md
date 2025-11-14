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

## Phase 4: Backend Service Layer & Testing Infrastructure - 2025-11-07 to 2025-11-08

### Completed Tasks

**Service Layer Implementation:**
- [x] Implemented 4 complete service modules (Notes, Sections, Conversations, Messages)
- [x] Created Zod validation schemas for all API inputs/outputs
- [x] Built 12 API route handlers with full CRUD operations
- [x] Implemented soft delete (notes, conversations) vs hard delete (sections) patterns
- [x] Added message immutability (no update/delete on messages)

**Testing Infrastructure:**
- [x] Established dual Jest configuration (server tests on Node, client tests on jsdom)
- [x] Created dedicated test database environment with `.env.test`
- [x] Built comprehensive test utilities (`supabase-test-client.ts`, `db.ts` helpers)
- [x] Implemented authenticated test client (`getTestUserClient`) vs admin client separation
- [x] Created database reset utilities with FK-safe truncation
- [x] Added seed data helpers for consistent test fixtures

**Test Coverage:**
- [x] 40+ unit tests for service layer (business logic validation)
- [x] 50+ integration tests for route handlers (API contract verification)
- [x] 11 test suites and 80 tests with 100% pass rate
- [x] Verified Row-Level Security (RLS) enforcement through authenticated test clients
- [x] Tested error handling (400, 401, 404, 500 responses)
- [x] Validated Zod schema enforcement at API boundaries

**API Routes Implemented:**
```
Chat:
- GET    /api/chat                    # List conversations
- POST   /api/chat                    # Create conversation
- GET    /api/chat/[id]               # Get conversation
- PATCH  /api/chat/[id]               # Update conversation
- DELETE /api/chat/[id]               # Archive conversation
- GET    /api/chat/[id]/messages      # List messages
- POST   /api/chat/[id]/messages      # Create message

Notes:
- GET    /api/notes                   # List active notes
- POST   /api/notes                   # Create note
- GET    /api/notes/[id]              # Get note
- PATCH  /api/notes/[id]              # Update note
- DELETE /api/notes/[id]              # Soft delete note

Sections:
- GET    /api/sections                # List sections
- POST   /api/sections                # Create section
- GET    /api/sections/[id]           # Get section
- PATCH  /api/sections/[id]           # Update section
- DELETE /api/sections/[id]           # Hard delete section
```
### Next Steps
1. Implement Quran Foundation API client (external integration)
2. Implement Gemini AI client (LLM integration)
3. Begin frontend UI development

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

### Decision 09: Dual Jest Configuration (Node + jsdom)
- **Date**: 2025-11-x
- **Decision**: Split Jest into two project configurations (server + client)
- **Rationale**:
  - Node.js environment required for Supabase client and Next.js route handlers
  - jsdom required for React component tests (future frontend)
  - Jest 30 removed implicit TypeScript transforms, requiring explicit ts-jest
  - Cross-platform consistency (Windows PowerShell) required cross-env package
- **Tradeoff**: More complex setup, but isolated environments prevent test pollution

### Decision 10: Test Database Isolation
- **Date**: 2025-11-x
- **Decision**: Use dedicated Supabase project for testing (`.env.test`)
- **Rationale**:
  - Prevents test data pollution in development database
  - Enables aggressive truncation between test runs
  - Allows RLS policy testing with real authentication
  - Parallel development and testing without conflicts
- **Tradeoff**: Additional Supabase project (still free tier), more setup complexity

### Decision 11: Authenticated Test Client vs Admin Client Separation
- **Date**: 2025-11-x
- **Decision**: Use `getTestUserClient()` for RLS testing, `createAdminClient()` only for privileged setup
- **Rationale**:
  - RLS policies must be tested with authenticated users (not service role)
  - Admin client bypasses RLS, creating "mock theater" in security tests
  - Separation ensures tests validate actual user-facing security behavior
- **Tradeoff**: More complex test setup (seed users, auth headers), but genuine RLS verification

### Decision 12: Message Immutability
- **Date**: 2025-11-x
- **Decision**: Messages have no UPDATE or DELETE operations
- **Rationale**:
  - Chat history should be immutable for context preservation
  - Simplifies AI conversation threading
  - Prevents accidental history tampering
  - Standard pattern in chat applications (Slack, Discord)
- **Tradeoff**: Cannot edit messages (could add "edit history" in V2 if needed)

### Decision 13: Soft Delete vs Hard Delete Pattern
- **Date**: 2025-11-13
- **Decision**: 
  - Notes: Soft delete (deleted_at timestamp, 30-day retention)
  - Conversations: Soft delete (archived boolean)
  - Sections: Hard delete (permanent removal)
- **Rationale**:
  - User content (notes, conversations) should be recoverable
  - Structural entities (sections) are organizational, not content
  - Soft delete enables "trash can" UX for user content
- **Tradeoff**: Database rows remain (storage cost), but negligible at MVP scale


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

### Challenge 4: Mock Theater in Unit Tests (Initial Implementation)
- **Date**: 2025-11-07
- **Problem**: Initial unit tests validated mocked return values instead of actual business logic, creating false confidence in test coverage
- **Impact**: Tests passed but didn't catch edge cases (null handling, error propagation, validation failures)
- **Attempted Solutions**:
  1. Basic mocks that returned hardcoded data - caught no bugs
  2. Partial mocks that validated some logic - inconsistent coverage
- **Final Solution**: Redesigned all 40+ service tests to:
  - Mock only the Supabase client surface (`.from().select()` chain)
  - Test actual business logic in service methods (error handling, null checks, data transformation)
  - Validate edge cases (empty results, PGRST116 errors, validation failures)
- **Code Changes**: All service test files (`*.service.test.ts`)
- **Learning**: "Mock at the boundary, test the logic" - mock external dependencies (DB), test your code
- **Metrics**: "Identified and eliminated 'mock theater' anti-pattern across 40+ unit tests, redesigning to validate actual business logic vs. superficial mocked returns"

---

### Challenge 5: Inconsistent Auth & Test Environment Logic
- **Date**: 2025-11-07 to 2025-11-08
- **Problem**: Authentication behavior differed between runtime and tests, causing systematic failures:
  - Some tests used `getTestUserClient`, others required admin privileges
  - Routes assumed real Supabase auth, tests simulated none or used wrong clients
  - Conversations couldn't be seeded reliably (FK constraints failed)
  - DELETE operations behaved inconsistently across services/routes
  - Hardcoded UUIDs, invalid request bodies (`null as any`), mismatched client permissions
- **Impact**: 
  - 50+ route integration tests failing
  - 3-4 days of debugging authentication flow
  - Could not verify RLS policies (using admin bypassed security)
  - Test environment didn't match production behavior
- **Attempted Solutions**:
  1. Mock Supabase client directly - unstable, inconsistent with RLS behavior
  2. Use single test user for everything - failed when privileged inserts required (admin operations)
  3. Mix of auth strategies across tests - created inconsistent patterns, hard to debug
- **Final Solution**:
  - **Centralized auth utilities:**
    - `getTestUserClient()`: Returns authenticated client for seeded test user (verifies RLS)
    - `createAdminClient()`: Returns service role client for privileged setup only (seed data, truncate)
    - `requireAuth()`: Added test-mode branch to handle test authentication
  - **Standardized patterns:**
    - Route tests always use `getTestUserClient()` for API calls (RLS verification)
    - Admin client ONLY for test setup (creating foreign user data, truncating tables)
    - Consistent request body formatting (JSON.stringify, proper headers)
    - Dynamic UUID generation (`crypto.randomUUID()`) instead of hardcoded values
    - Aligned DELETE route behavior with service semantics (soft vs hard delete)
  - **Environment separation:**
    - Dedicated test database (`.env.test`)
    - Dual Jest configs (server/client split)
    - NODE_ENV=test enforcement with cross-env
- **Code Changes**: 
  - `lib/helpers/auth.ts` (requireAuth test mode)
  - `lib/helpers/supabase-test-client.ts` (centralized test auth)
  - `lib/helpers/db.ts` (FK-safe truncation, seed helpers)
  - All route test files (`app/api/**/route.test.ts`)
  - All route handlers (consistent param extraction, error handling)
- **Learning**: 
  - **Authentication in tests must mirror production** - using admin bypasses RLS, creating "security theater"
  - **Centralize test utilities early** - ad-hoc auth patterns across 50+ tests became unmaintainable
  - **Test with real constraints** - FK violations, RLS policies catch bugs mocks don't
  - **Separate concerns**: Admin for setup, authenticated user for testing, never mix
- **Time Spent**: ~3-4 days (75% debugging auth, 25% writing tests)

---

### Challenge 6: Jest 30 + TypeScript 5 + Next.js 16 Compatibility
- **Date**: 2025-11-07
- **Problem**: Jest 30 removed implicit TypeScript transforms, breaking all tests
- **Impact**: Tests wouldn't run, TypeScript syntax errors in Jest
- **Attempted Solutions**:
  1. Update Jest config - insufficient without transformer
  2. Add Babel - unnecessary complexity for TypeScript-only project
- **Final Solution**:
  - Installed `ts-jest` for TypeScript transformation
  - Created `jest.server.config.cjs` for Node environment tests
  - Added `cross-env` for consistent NODE_ENV across Windows/Unix
  - Configured `runInBand` for Supabase tests (not worker-safe)
- **Code Changes**: 
  - `jest.config.js` (dual project setup)
  - `jest.server.config.cjs` (server-specific config)
  - `package.json` (test scripts with cross-env)
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
| Framework Init | 1h	| 2.5h | Infrastructure setup, fixing scaffold errors (see  challenges) |
| ERD Design | 1h | 2h | Initial design + iteration on relationships |
| Feature Specs | 1h | 1.5h | Documenting requirements and AI constraints |
| Database Schema | 2h | 3h | Writing migration + security hardening |
| RLS Security Review | 0.5h | 1h | Identifying and fixing join table vulnerabilities |
| **Service Layer** | **8h** | **12h** | 4 services, all CRUD operations |
| **Testing Infrastructure** | **4h** | **16h** | Dual configs, test DB, auth debugging |
| **Unit Tests** | **6h** | **8h** | 40+ service tests |
| **Integration Tests** | **8h** | **20h** | 50+ route tests + auth debugging |
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
| Database Tables | 9 | 2025-11-0x|
| RLS Policies | 32 | 2025-11-x |
| API Endpoints | 12 | 2025-11-x |
| Service Methods | 35 | 2025-11-x |
| Unit Tests | 40+ | 2025-11-x |
| Integration Tests | 50+ | 2025-11-0 |
| **Total Tests** | **80** | 2025-11-14 |
| **Test Pass Rate** | **100%** | 2025-11-14 |
| Test Coverage (Services) | 95%+ | 2025-11-14 |
| Test Coverage (Routes) | 100% | 2025-11-14 |

---

## Dependencies Added

[Track as packages are installed]


| Package | Version | Purpose | Date Added |
|---------|---------|---------|------------|
| @supabase/supabase-js | ^2.39.0 | Supabase client Library | 2025-11-06 |
| @supabase/auth-helpers-nextjs | ^0.8.7 | Next.js auth integration | 2025-11-05 |
| next | ^16.x | Frontend/Backend framework | 2025-11-06 |
| react, react-dom | ^19.x | UI Library | 2025-11-06 |
| zod | ^4.x | Runtime validation (Contracts-First) | 2025-11-06 |
| typescript | ^5.x | Language/Compiler | 2025-11-06 |
| tailwindcss | ^3.x | Styling utility | 2025-11-06 |
| ts-jest | ^29.1.1 | TypeScript transformer for Jest | 2025-11-07 |
| cross-env | ^7.0.3 | Cross-platform env variables | 2025-11-07 |
| @types/jest | ^29.5.11 | TypeScript types for Jest | 2025-11-07 |


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