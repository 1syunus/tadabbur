# Feature Specifications

## Overview

A notebook/chat application for Qur'anic reflection that combines:
- AI-powered Q&A with theological constraints
- Multi-page notebook with rich organization
- Seamless integration between chat and notes

---

## Core Features

### 1. AI Chat Interface

**User Story:** As a user striving to reflect on the Qur'an, I want to ask questions in natural language and receive thoughtful, theologically sound responses.

**Requirements:**
- Natural language input (e.g., "What does the Qur'an say about patience?")
- AI responds with relevant ayat and tafsir
- Conversation has memory (last 10 messages for context)
- Conversations can be tagged for organization
- Conversations can be archived (soft delete)

**AI Behavioral Constraints:**
[Add/edit constraints here]
- AI should train people in linear and logical thinking, drawing for the latter primarily on formal and modal logic.
- It should implicitly encourage and support a literary analytical approach to reflection, including - such tools as close reading, through subtly guiding responses, elaboration, and suggestions
- It should encourage and support making connections between portions of the Qur'an through suggestions, reminders, references to notes; there should also be some feature that allows connections or patterns to be observable in the notebook/journal, perhaps by a filtering by ayah/theme, keyword, or something else
- It should not glaze, nor encourage or support erroneous or fallacious reflections. That undermines the added value of the app and can potentially risk offending informed users. On the contrary, it should constructively identify and redirect such thinking and conclusions toward truth, logic, precision, and accuracy
- It should promote moral and character based reflections over creedal or legal ones (e.g., the importance of filial piety: 'look at the placement of the "birrul walidayn" in this list -- the parents are right after God!')
- It should encourage further questioning with authorities (always referring to "scholars of madhahib, scholars of creed or natural theology," etc) when reflections or conclusions go in legal or credal directions
- It should proactively yet implicitly direct away from heretical (i.e., "dangerous/offensive" to informed users) thinking by responding with the use of logic, API available tafsir, and any training data on Ahl Sunnah; simultaneously, literalist, anthropomorophic, extremist, fractional (e.g., salafi, shi'i) thought should be identified behind the scenes and actively discouraged without mentioning names or ideologies to the user. In such cases, redirection toward the orthodoxic or orthopraxic is required, and mentioning them (e.g., tanzih, madhahib) as such is fine.
- It should not make suggestions or draw conclusions about creed, law, or formal spirituality (i.e., tasawwuf) but should encourage recourse to scholars of madhahib, the three creedal schools, and formal spiritual paths.
- It should, whenever possible, include relevant Scripture and/or exegesis in responses
- It should not be allowed to web search
- It should not use the English words "verse" or "chapter," but instead transliterated "ayah/ayat, surah/suwar"

---

### 2. Multi-Page Notebook

**User Story:** As a user, I want to organize my reflections in a structured notebook with multiple pages and sections.

**Requirements:**
- Create unlimited pages (like Word documents)
- Markdown support for formatting
- Group pages into sections/tabs
- Reorder pages and sections
- Soft delete (trash can with 30-day retention)
- Search across all notes

---

### 3. Tagging System

**User Story:** As a user, I want to tag conversations and notes so I can find related content easily.

**Requirements:**
- User-created tags
- AI-suggested tags (from content analysis)
- Tag both conversations and note pages
- Filter view by tags
- Autocomplete when typing tags

---

### 4. Ayah Cross-Referencing

**User Story:** As a user, I want to see all my notes that mention a specific ayah.

**Requirements:**
- Automatic detection of ayah references (e.g., "2:255")
- Click ayah → see all related notes/conversations
- Display format: "Surah 2, Ayah 255" (never "chapter/verse")

---

### 5. Chat → Note Transfer

**User Story:** As a user, I want to save important chat messages to my notebook without copy-pasting.

**Requirements:**
- One-click "Save to Notes" button on messages
- Preserves ayah references
- Auto-applies conversation tags
- Optionally add to existing section

---

### 6. AI Pattern Recognition

**User Story:** As a user, I want the AI to help me notice patterns in my reflections.

**Requirements:**
- Weekly batch analysis of all notes
- Identify recurring themes
- Suggest connections between notes
- User can dismiss insights
- Confidence score (0.0-1.0) displayed

---

## Business Rules

1. **User Data Isolation:** Users can only see their own conversations, notes, tags
2. **Soft Delete:** Deleted notes go to trash, permanent delete after 30 days
3. **Ayah Format:** Always use "ayah/ayat, surah/suwar" (never "verse/chapter")
4. **Tafsir Sources:** Include all available tafsir from API
5. **Tag Scope:** Tags are user-scoped (not global)
6. **Section Optional:** Pages can exist outside sections

---

## Non-Functional Requirements

### Performance
- Chat response: <3s (p95)
- Note page load: <500ms
- Search results: <1s

### Security
- Row-Level Security on all tables
- No user can access another's data
- Service role bypasses RLS (admin only)

### Scalability
- Support 1000+ notes per user
- Support 100+ conversations per user
- Efficient full-text search

---

## Out of Scope (V1)

- [ ] Shared notes/conversations
- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] Verse memorization tracking
- [ ] Audio recitation
- [ ] Public note sharing