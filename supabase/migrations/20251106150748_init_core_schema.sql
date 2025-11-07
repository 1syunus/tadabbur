-- ==========================================
-- Tadabbur Reflection App - Initial Schema
-- ==========================================
-- 
-- Purpose: Core database schema for chat + notebook application
-- Features: Conversations, Messages, Notebook Pages, Tags, AI Insights
-- Security: Row-Level Security on all tables
--
-- ==========================================

-- ==========================================
-- TABLES
-- ==========================================

-- ------------------------------------------
-- Table: conversations
-- Purpose: AI chat sessions
-- ------------------------------------------
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- Table: messages
-- Purpose: Individual messages in conversations
-- ------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ayah_references TEXT[] DEFAULT '{}',
  tafsir_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- Table: note_sections
-- Purpose: Groups of notebook pages (tabs)
-- ------------------------------------------
CREATE TABLE note_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  order_index INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- Table: note_pages
-- Purpose: Individual notebook pages
-- ------------------------------------------
CREATE TABLE note_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES note_sections(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT,
  order_index INT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------
-- Table: tags
-- Purpose: User and AI-generated tags
-- ------------------------------------------
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user_created', 'ai_generated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: user can't have duplicate tag names
  UNIQUE(user_id, name)
);

-- ------------------------------------------
-- Table: conversation_tags (Join Table)
-- Purpose: Many-to-many relationship between conversations and tags
-- ------------------------------------------
CREATE TABLE conversation_tags (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (conversation_id, tag_id)
);

-- ------------------------------------------
-- Table: note_page_tags (Join Table)
-- Purpose: Many-to-many relationship between note pages and tags
-- ------------------------------------------
CREATE TABLE note_page_tags (
  note_page_id UUID NOT NULL REFERENCES note_pages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (note_page_id, tag_id)
);

-- ------------------------------------------
-- Table: ai_insights
-- Purpose: AI-detected patterns across user's notes
-- ------------------------------------------
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'connection', 'theme')),
  title TEXT,
  description TEXT,
  related_note_pages UUID[] DEFAULT '{}'::uuid[],
  related_ayat TEXT[] DEFAULT '{}'::text[],
  confidence_score FLOAT DEFAULT NULL CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)),
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_archived ON conversations(archived) WHERE NOT archived;
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at ASC);
CREATE INDEX idx_messages_ayah_refs ON messages USING GIN (ayah_references);

-- Note Sections
CREATE INDEX idx_note_sections_user_id ON note_sections(user_id);
CREATE INDEX idx_note_sections_order ON note_sections(user_id, order_index);

-- Note Pages
CREATE INDEX idx_note_pages_user_id ON note_pages(user_id);
CREATE INDEX idx_note_pages_section_id ON note_pages(section_id);
CREATE INDEX idx_note_pages_deleted_at ON note_pages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_note_pages_multilingual ON note_pages USING GIN (to_tsvector('simple', content));
CREATE INDEX idx_note_pages_updated_at ON note_pages(updated_at DESC);

-- Tags
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(user_id, name);

-- Conversation Tags
CREATE INDEX idx_conversation_tags_conversation ON conversation_tags(conversation_id);
CREATE INDEX idx_conversation_tags_tag ON conversation_tags(tag_id);

-- Note Page Tags
CREATE INDEX idx_note_page_tags_page ON note_page_tags(note_page_id);
CREATE INDEX idx_note_page_tags_tag ON note_page_tags(tag_id);

-- AI Insights
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_dismissed ON ai_insights(dismissed) WHERE NOT dismissed;
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: conversations.updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: note_pages.updated_at
CREATE TRIGGER update_note_pages_updated_at
  BEFORE UPDATE ON note_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW-LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_page_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
CREATE POLICY "users_view_own_conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Messages Policies
-- Users can access messages if they own the conversation
CREATE POLICY "users_view_own_messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

  CREATE POLICY "users_delete_own_messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Note Sections Policies
CREATE POLICY "users_view_own_note_sections"
  ON note_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_note_sections"
  ON note_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_note_sections"
  ON note_sections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_note_sections"
  ON note_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Note Pages Policies
CREATE POLICY "users_view_own_note_pages"
  ON note_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_note_pages"
  ON note_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_note_pages"
  ON note_pages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_note_pages"
  ON note_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Tags Policies
CREATE POLICY "users_view_own_tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Conversation Tags Policies
-- Users can access if they own the conversation
CREATE POLICY "users_view_own_conversation_tags"
  ON conversation_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 from tags
      WHERE tags.id = conversation_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_conversation_tags"
  ON conversation_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = conversation_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

  CREATE POLICY "users_delete_own_conversation_tags"
  ON conversation_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = conversation_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

-- Note Page Tags Policies
-- Users can access if they own the note page
CREATE POLICY "users_view_own_note_page_tags"
  ON note_page_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM note_pages
      WHERE note_pages.id = note_page_tags.note_page_id
      AND note_pages.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = note_page_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_page_tags"
  ON note_page_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM note_pages
      WHERE note_pages.id = note_page_tags.note_page_id
      AND note_pages.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = note_page_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_note_page_tags"
  ON note_page_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM note_pages
      WHERE note_pages.id = note_page_tags.note_page_id
      AND note_pages.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = note_page_tags.tag_id
      AND tags.user_id = auth.uid()
    )
  );

-- AI Insights Policies
CREATE POLICY "users_view_own_ai_insights"
  ON ai_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_ai_insights"
  ON ai_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_ai_insights"
  ON ai_insights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_ai_insights"
  ON ai_insights FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- COMMENTS (Documentation)
-- ==========================================

COMMENT ON TABLE conversations IS 'AI chat sessions with memory and tagging';
COMMENT ON TABLE messages IS 'Individual messages in conversations (user and AI responses)';
COMMENT ON TABLE note_sections IS 'Groups of notebook pages (like tabs)';
COMMENT ON TABLE note_pages IS 'Individual notebook pages with markdown content';
COMMENT ON TABLE tags IS 'User-created and AI-generated tags for organization';
COMMENT ON TABLE conversation_tags IS 'Many-to-many: Conversations ↔ Tags';
COMMENT ON TABLE note_page_tags IS 'Many-to-many: Note Pages ↔ Tags';
COMMENT ON TABLE ai_insights IS 'AI-detected patterns across user notes';

COMMENT ON COLUMN conversations.archived IS 'Soft delete flag for conversations';
COMMENT ON COLUMN messages.role IS 'Either "user" or "assistant"';
COMMENT ON COLUMN messages.ayah_references IS 'Array of verse keys (e.g., ["2:255", "3:159"])';
COMMENT ON COLUMN messages.tafsir_used IS 'JSONB array of tafsir sources and excerpts used';
COMMENT ON COLUMN note_pages.deleted_at IS 'Soft delete timestamp (NULL = active, set = in trash)';
COMMENT ON COLUMN note_pages.content IS 'Markdown-formatted content';
COMMENT ON COLUMN tags.type IS 'Either "user_created" or "ai_generated"';
COMMENT ON COLUMN ai_insights.confidence_score IS 'AI confidence in insight (0.0 to 1.0)';
COMMENT ON COLUMN ai_insights.dismissed IS 'User dismissed this insight';