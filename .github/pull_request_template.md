## PR Type

Please select the type of change being introduced:

- [ ] **feat**: A new feature (corresponds to a new Phase/Milestone)
- [ ] **fix**: A bug fix
- [ ] **refactor**: Code change that neither fixes a bug nor adds a feature
- [ ] **docs**: Documentation only changes (e.g., updating ERD, README)
- [x] **chore**: Infrastructure/tooling changes, build process, or dependency updates (used for this migration)

---

## Summary of Changes

*Brief, high-level overview of what this PR achieves.*

This PR finalizes Phase 2 by implementing the full normalized database schema.

### Data Contract Changes (If Applicable)

*List the key tables/fields introduced or modified.*

- **New Tables:** `conversations`, `messages`, `note_pages`, `tags`, etc. (9 entities total).
- **Security:** RLS enabled on all tables.
- **Types:** Created `message_role`, `tag_type`, and `insight_type` **ENUM** types.

### Rationale

*Why was this change needed? Link to the relevant part of the `feature_specs.md`.*

The complex features (e.g., grouped notes, chat memory, AI patterns) necessitated a shift from a simple `reflections` table to a fully normalized structure for scalability and efficiency.

---

## Testing Plan

*How were these changes validated?*

- **Local Deployment:** Ran `npx supabase db push` successfully.
- **Type Generation:** Ran `supabase gen types` successfully, confirming the new schema entities are reflected in `types/supabase.ts`.
- **Security Audit:** Manually reviewed RLS policies for correctness on complex joins (e.g., `conversation_tags`).

---

## 📸 Screenshots / Demos (N/A for Data Phase)

*Keep this section, but mark it as N/A for data/backend PRs. It's essential for frontend/UI work.*

N/A. (Schema changes only.)