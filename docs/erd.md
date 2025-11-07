# Entity-Relationship Diagram

## Visual Schema
```
┌─────────────────────┐
│   auth.users        │
│   (Supabase Auth)   │
├─────────────────────┤
│ id (UUID, PK)       │
│ email               │
│ created_at          │
└──────────┬──────────┘
           │ 1
           │
    ┌──────┴──────────────────────────────────┐
    │                                          │
    │ ∞                                        │ ∞
    │                                          │
┌───▼──────────────┐                ┌─────────▼────────┐
│ conversations    │                │ note_sections    │
├──────────────────┤                ├──────────────────┤
│ id (PK)          │                │ id (PK)          │
│ user_id (FK)     │                │ user_id (FK)     │
│ title            │                │ name             │
│ archived         │                │ color            │
│ created_at       │                │ order_index      │
│ updated_at       │                │ created_at       │
└───┬──────────────┘                └─────────┬────────┘
    │ 1                                       │ 1
    │ ∞                                       │ ∞
┌───▼──────────────┐                ┌─────────▼────────┐
│ messages         │                │ note_pages       │
├──────────────────┤                ├──────────────────┤
│ id (PK)          │                │ id (PK)          │
│ conversation_id  │                │ user_id (FK)     │
│ role             │                │ section_id (FK?) │
│ content          │                │ title            │
│ ayah_references[]│                │ content (MD)     │
│ tafsir_used JSON │                │ order_index      │
│ created_at       │                │ deleted_at (?)   │
└──────────────────┘                │ created_at       │
                                    │ updated_at       │
                                    └──────────────────┘

┌─────────────────────┐
│ tags                │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ name                │
│ type (user|ai)      │
│ created_at          │
└──────┬──────────────┘
       │
       ├─────────────────┬─────────────────┐
       │ ∞               │ ∞               │
┌──────▼──────────┐ ┌────▼────────────┐   │
│conversation_tags│ │ note_page_tags  │   │
├─────────────────┤ ├─────────────────┤   │
│ conversation_id │ │ note_page_id    │   │
│ tag_id          │ │ tag_id          │   │
│ (Composite PK)  │ │ (Composite PK)  │   │
└─────────────────┘ └─────────────────┘   │
                                           │ ∞
                                    ┌──────▼────────────┐
                                    │ ai_insights       │
                                    ├───────────────────┤
                                    │ id (PK)           │
                                    │ user_id (FK)      │
                                    │ insight_type      │
                                    │ title             │
                                    │ description       │
                                    │ related_notes[]   │
                                    │ related_ayat[]    │
                                    │ confidence_score  │
                                    │ dismissed         │
                                    │ created_at        │
                                    └───────────────────┘
```

---

## Entities

### 1. conversations

**Purpose:** Stores AI chat sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique conversation ID |
| `user_id` | UUID | FK → auth.users, NOT NULL | Owner |
| `title` | TEXT | | Auto-generated from first message |
| `archived` | BOOLEAN | DEFAULT false | Soft delete flag |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Indexes:**
- `idx_conversations_user_id` ON `user_id`
- `idx_conversations_archived` ON `archived` WHERE NOT archived

---

### 2. messages

**Purpose:** Individual messages in a conversation

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `conversation_id` | UUID | FK → conversations, NOT NULL | Parent conversation |
| `role` | TEXT | CHECK IN ('user', 'assistant') | Who sent it |
| `content` | TEXT | NOT NULL | Message text |
| `ayah_references` | TEXT[] | | Array of verse keys ["2:255"] |
| `tafsir_used` | JSONB | | Which tafsir excerpts included |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_messages_conversation_id` ON `conversation_id`
- `idx_messages_ayah_refs` ON `ayah_references` USING GIN

**Business Rules:**
- Messages ordered by `created_at` ASC
- Deleting conversation → CASCADE delete messages

---

### 3. note_sections

**Purpose:** Groups of notebook pages (like tabs)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → auth.users, NOT NULL | |
| `name` | TEXT | NOT NULL | "Patience Studies" |
| `color` | TEXT | | Hex color for UI (#3B82F6) |
| `order_index` | INT | | For sorting |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_note_sections_user_id` ON `user_id`
- `idx_note_sections_order` ON `(user_id, order_index)`

---

### 4. note_pages

**Purpose:** Individual notebook pages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → auth.users, NOT NULL | |
| `section_id` | UUID | FK → note_sections, NULL | Optional grouping |
| `title` | TEXT | | Page title |
| `content` | TEXT | | Markdown content |
| `order_index` | INT | | Order within section |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete (trash) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_note_pages_user_id` ON `user_id`
- `idx_note_pages_section_id` ON `section_id`
- `idx_note_pages_content_search` ON `content` USING GIN (to_tsvector('english', content))
- `idx_note_pages_deleted_at` ON `deleted_at` WHERE deleted_at IS NULL

**Business Rules:**
- `deleted_at IS NULL` = active page
- Deleting section → pages become standalone (section_id = NULL)

---

### 5. tags

**Purpose:** User and AI-generated tags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → auth.users, NOT NULL | User-scoped |
| `name` | TEXT | NOT NULL | "patience", "family-relations" |
| `type` | TEXT | CHECK IN ('user_created', 'ai_generated') | Source |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_tags_user_id` ON `user_id`
- UNIQUE constraint on `(user_id, name)`

---

### 6. conversation_tags (Join Table)

**Purpose:** Many-to-many: Conversations ↔ Tags

| Column | Type | Constraints |
|--------|------|-------------|
| `conversation_id` | UUID | FK → conversations |
| `tag_id` | UUID | FK → tags |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Primary Key:** `(conversation_id, tag_id)`

---

### 7. note_page_tags (Join Table)

**Purpose:** Many-to-many: Note Pages ↔ Tags

| Column | Type | Constraints |
|--------|------|-------------|
| `note_page_id` | UUID | FK → note_pages |
| `tag_id` | UUID | FK → tags |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Primary Key:** `(note_page_id, tag_id)`

---

### 8. ai_insights

**Purpose:** AI-detected patterns across user's notes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → auth.users, NOT NULL | |
| `insight_type` | TEXT | CHECK IN ('pattern', 'connection', 'theme') | |
| `title` | TEXT | | "Frequent patience reflections" |
| `description` | TEXT | | Detailed explanation |
| `related_note_pages` | UUID[] | | Array of note IDs |
| `related_ayat` | TEXT[] | | Array of verse keys |
| `confidence_score` | FLOAT | CHECK 0.0-1.0 | AI confidence |
| `dismissed` | BOOLEAN | DEFAULT false | User dismissed? |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_ai_insights_user_id` ON `user_id`
- `idx_ai_insights_dismissed` ON `dismissed` WHERE NOT dismissed

---

## Relationships

| From | To | Type | Cardinality | Cascade |
|------|-----|------|-------------|---------|
| User | Conversations | 1:∞ | One user, many conversations | DELETE CASCADE |
| User | NoteSections | 1:∞ | One user, many sections | DELETE CASCADE |
| User | NotePages | 1:∞ | One user, many pages | DELETE CASCADE |
| User | Tags | 1:∞ | One user, many tags | DELETE CASCADE |
| User | AIInsights | 1:∞ | One user, many insights | DELETE CASCADE |
| Conversation | Messages | 1:∞ | One conversation, many messages | DELETE CASCADE |
| NoteSection | NotePages | 1:∞ | One section, many pages (optional) | SET NULL |
| Conversation | Tags | ∞:∞ | Via conversation_tags | DELETE CASCADE |
| NotePage | Tags | ∞:∞ | Via note_page_tags | DELETE CASCADE |

---

## RLS Policies

All tables enable Row-Level Security. Users can only access their own data.
```sql
-- Example policy (replicate for all tables)
CREATE POLICY "users_own_data"
  ON conversations FOR ALL
  USING (auth.uid() = user_id);
```

**Service Role Bypass:** Backend operations use service_role key to bypass RLS when needed (e.g., admin operations).

---

## Performance Considerations

### Full-Text Search
- `note_pages.content` indexed with `to_tsvector('english', content)`
- Supports queries like: `WHERE content @@ to_tsquery('patience')`

### Array Queries
- `messages.ayah_references` indexed with GIN
- Efficient lookups: `WHERE '2:255' = ANY(ayah_references)`

### Soft Deletes
- Partial indexes on `WHERE deleted_at IS NULL`
- Cron job to permanently delete after 30 days

---

## Migration Strategy

1. Create tables in dependency order
2. Add indexes
3. Enable RLS and create policies
4. Add triggers (updated_at auto-update)
5. Generate TypeScript types