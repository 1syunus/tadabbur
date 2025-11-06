# Tadabbur - Quran Reflection Journal

> AI-powered semantic search and personal reflection tool for Quran study

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

**Status**: Phase 1: Foundation Complete, focused on 24 hour MVP

---

## Project Vision

A production-ready web application that helps Muslims deepen their Quran engagement through:

- **Natural Language Search**: Ask questions like "What does the Quran say about patience?" to find results across the Qu'ran
- **Personal Reflection Journal**: Save verses with private notes and track your history
- **AI That Prompts YOU**: Get reflection prompts generated for any verse so that you practice thoughtfulness - not AI
- **Multiple Translations**: Access trusted English translations and tafsir (gloss/commentary)
- **Privacy-First Design**: Your reflections stay private with database-level security

---

## Technical Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 | React Server Components, streaming UI |
| **Backend** | Next.js API Routes | Serverless functions, edge runtime |
| **Database** | Supabase (Postgres) | Row-Level Security, real-time subscriptions |
| **Authentication** | Supabase Auth | Email/password + OAuth (Google, GitHub) |
| **AI Layer** | Google Gemini 1.5 Flash | Query transformation, prompt generation |
| **Caching** | Multi-layer | Client (React Query) + Database (Postgres) |
| **Deployment** | Vercel | Automatic HTTPS, edge functions, CI/CD |
| **External API** | Quran Foundation API | Verses, translations, tafsir content |

### System Architecture
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│           Next.js Frontend                   │
│  (React Server Components + Client)         │
└──────┬──────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────┐
│         Next.js API Routes                   │
│  (Validation, Auth, Business Logic)         │
└──┬────┬────┬─────────────────────────────────┘
   │    │    │
   │    │    └─────► Supabase (User Data, Cache)
   │    │
   │    └──────────► Gemini API (Keyword Extraction)
   │
   └───────────────► Quran Foundation API (Verses)
```

### Key Design Decisions

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| **Next.js Monolith** | Simpler deployment, faster MVP iteration | Future: May split AI service for independent scaling |
| **Postgres RLS** | Database-enforced security, zero-trust architecture | Slightly more complex query patterns |
| **Gemini (Free tier)** | No cost barrier, fast inference (<2s) | Vendor dependency (mitigated by abstraction layer) |
| **Database Caching** | Persistent across sessions, reduces API calls 90%+ | Storage cost (negligible at MVP scale) |
| **Serverless Functions** | Auto-scaling, pay-per-use | Cold start latency (~100-300ms) |

### Development Strategy
We are prioritizing **Contract-Driven Design (CDD)** over strict Test-Driven Development (TDD), especially in light of **high-velocity MVP** development

| Rationale                  |  Benefit for MVP |
|-----------------------------|------------------------------------------------|
| Data Integrity First        | The Database schema (the data contract) is the most stable and foundational piece. We define and secure it before writing mutable business logic. |
| High Compiler Coverage      | TypeScript and Zod (runtime validation) act as the primary, high-value testing layer, catching data shape inconsistencies and errors that TDD would spend significant time unit-testing. |
| Faster Iteration            | We avoid the overhead of writing and maintaining unit tests for features that are still evolving, leading to a much faster delivery of the core application. |
| Test Layer Decoupling       | Comprehensive Jest/RTL tests can be added later without changing the foundational architecture, using our fixed contracts as reliable interfaces to test against. |



---

## Getting Started

### Prerequisites

- **Node.js** 18.17 or higher
- **npm** or **pnpm** 
- **Git** for version control
- **Supabase Account** (free tier): [https://supabase.com](https://supabase.com)
- **Google AI Studio API Key** (free): [https://makersuite.google.com](https://makersuite.google.com)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/1syunus/tadabbur.git
cd tadabbur

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# 4. Initialize Supabase
npx supabase init
npx supabase start

# 5. Run database migrations
npx supabase db push

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create `.env.local` in the root directory:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Rate Limiting (can add later)
# UPSTASH_REDIS_URL=your_redis_url
# UPSTASH_REDIS_TOKEN=your_redis_token
```

**Where to get your keys:**
- **Supabase**: Dashboard → Project Settings → API
- **Gemini**: [AI Studio](https://makersuite.google.com/app/apikey) → Create API Key

---

## Development Roadmap

### Phase 1: Foundation (Week 1)
- [x] Project setup and documentation
- [ ] Database schema design with RLS policies
- [ ] Quran Foundation API integration
- [ ] Basic search functionality

### Phase 2: Core Features (Week 2)
- [ ] User authentication (email + OAuth)
- [ ] Reflection CRUD operations
- [ ] AI semantic search (keyword extraction)
- [ ] Multi-layer caching implementation

### Phase 3: AI Features (Week 3)
- [ ] AI-generated reflection prompts
- [ ] Tafsir summarization
- [ ] Auto-tagging verses by theme

### Phase 4: Polish & Launch (Week 4)
- [ ] Rate limiting and abuse prevention
- [ ] Performance optimization
- [ ] Security audit
- [ ] Mobile responsiveness
- [ ] Production deployment

**Track detailed progress**: [GitHub Issues](https://github.com/1syunus/tadabbur/issues)

---

## Security & Privacy

This application implements security best practices:

- **Row-Level Security (RLS)**: Database-enforced access control - users can only access their own reflections
- **Input Validation**: All user inputs validated with Zod schemas before processing
- **Rate Limiting**: Prevents abuse of AI endpoints (5 requests/min per user)
- **SQL Injection Prevention**: Parameterized queries via Supabase client
- **XSS Prevention**: React auto-escaping + DOMPurify for user-generated content
- **CSRF Protection**: Built into Next.js framework
- **Secrets Management**: Environment variables only, never committed to git
- **HTTPS Everywhere**: Enforced by Vercel deployment

**Vulnerability Reporting**: See [SECURITY.md](./SECURITY.md)

---

## Testing
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Integration tests
npm run test:integration

# End-to-end tests (Playwright)
npm run test:e2e

# Test coverage report
npm run test:coverage
```

**Coverage Target**: >80% for critical paths (authentication, data access, AI integration)

---

## Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **Search Latency (p95)** | <2s | Multi-layer caching, CDN |
| **AI Response Time (p50)** | <1.5s | Prompt optimization, streaming |
| **First Contentful Paint** | <1.5s | Code splitting, image optimization |
| **Lighthouse Score** | >90 | SSR, optimized assets |
| **Cache Hit Rate** | >60% | Intelligent cache invalidation |
| **API Cost** | $0/month | Free tiers, aggressive caching |

---

## Contributing

Contributions are welcome provided they don't undermine the Laws and objectives of the Muslims! Please follow these steps for informed contributions:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow commit conventions**: `feat(scope): description`
4. **Write tests** for new features
5. **Update documentation** as needed
6. **Submit a Pull Request**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Development Guidelines

- Use **TypeScript** strictly (no `any` types)
- Follow **Next.js 14 best practices** (Server Components by default)
- Write **Zod schemas** for all external data
- Add **tests** for business logic
- Document **architectural decisions** in code comments

---

## Project Structure
```
quran-reflection-app/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Auth-protected routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── features/         # Feature-specific components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── ai/               # AI integration
│   └── quran-api/        # Quran Foundation API client
├── types/                 # TypeScript types and Zod schemas
├── supabase/
│   └── migrations/       # Database migrations (versioned)
├── public/               # Static assets
└── tests/                # Test files
```

---

## API Documentation

### Quran Foundation API
- **Base URL**: `https://api.quran.foundation/v1`
- **Documentation**: [https://api-docs.quran.foundation](https://api-docs.quran.foundation)
- **Rate Limits**: Generous (no documented limit, but we cache aggressively)

### Internal API Routes
- `POST /api/search` - Semantic search with AI
- `GET /api/verses/:id` - Get verse by ID
- `POST /api/reflections` - Save user reflection
- `POST /api/ai/prompt` - Generate reflection prompt

Full API documentation will be available at `/api/docs` after deployment.

---

## Acknowledgments

- **Quran Foundation** for providing the excellent API and translations
- **Supabase** for the incredible developer experience
- **Vercel** for seamless deployment and hosting
- **Next.js team** for the amazing framework
- **Google** for Gemini API access

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/1syunus/tadabbur/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/1syunus/tadabbur/discussions)
- **Email**: suhayb.yunus.314@gmail.com

---

**⚠️ Disclaimer**: This is an independent project and is not officially affiliated with Quran Foundation. All Quranic content is sourced from their public API with proper attribution. This tool is meant to aid in Quran study and reflection, not to replace traditional scholarship, tafsir, to provide or derive creed, law, or formalized spiritual practices.