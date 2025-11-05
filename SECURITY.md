# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly:

**Email**: suhayb.yunus.314@gmail.com  
**Subject**: [SECURITY] Brief description

### What to Include

1. **Description**: Detailed explanation of the vulnerability
2. **Impact**: What could an attacker do?
3. **Steps to Reproduce**: How to trigger the vulnerability
4. **Suggested Fix**: If you have ideas (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Best effort

---

## Security Measures

### Implemented

- [x] **Row-Level Security (RLS)**: Database-enforced access control
- [x] **Environment Variables**: All secrets in .env files (never committed)
- [x] **.gitignore Configuration**: Prevents secret leakage
- [ ] **Input Validation**: Zod schemas for all user inputs (in progress)
- [ ] **Rate Limiting**: Prevent abuse of AI endpoints (planned)
- [ ] **SQL Injection Prevention**: Parameterized queries (in progress)
- [ ] **XSS Prevention**: React escaping + DOMPurify (in progress)
- [ ] **CSRF Protection**: Next.js built-in (enabled by default)

### Planned

- [ ] **Security Audit**: Third-party review before production
- [ ] **Dependency Scanning**: Automated vulnerability checks (Dependabot)
- [ ] **Penetration Testing**: Before public launch
- [ ] **Error Monitoring**: Sentry integration
- [ ] **Audit Logging**: Track sensitive operations

---

## Secure Development Practices

### Authentication
- Supabase handles auth (industry-standard JWT)
- Session tokens stored in httpOnly cookies
- OAuth providers: Google, GitHub (optional)

### Data Protection
- Reflections are private by default
- RLS policies prevent cross-user data access
- No PII logged to console or error tracking

### API Security
- All API routes validate auth tokens
- Rate limiting on expensive operations
- Input sanitization on all endpoints

---

## Disclosure Policy

- **Public Disclosure**: After fix is deployed and users have time to update
- **Credit**: We will credit researchers who report vulnerabilities (unless you prefer anonymity)
- **Bounty**: Not available at this time (open-source project)

---

## Security Checklist for Contributors

Before submitting a PR:

- [ ] No hardcoded secrets (check with \git diff\)
- [ ] All user inputs validated
- [ ] No SQL string concatenation
- [ ] User content sanitized before rendering
- [ ] Auth checks on protected routes
- [ ] Error messages don't leak sensitive info

---

**Last Updated**: 2025-11-05