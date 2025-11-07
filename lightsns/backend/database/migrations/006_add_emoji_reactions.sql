-- Migration: Add emoji reactions table
-- Purpose: Replace comments system with emoji-only reactions
-- Date: 2025-10-28

-- Create emoji_type enum
DO $$ BEGIN
  CREATE TYPE emoji_type AS ENUM ('👍', '❤️', '😂', '😮', '😢', '👏');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji emoji_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- One reaction per user per post
  UNIQUE(post_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji ON reactions(emoji);
CREATE INDEX IF NOT EXISTS idx_reactions_post_emoji ON reactions(post_id, emoji);

-- Create view for reaction counts per post
CREATE OR REPLACE VIEW post_reaction_stats AS
SELECT
  post_id,
  emoji,
  COUNT(*) as count
FROM reactions
GROUP BY post_id, emoji;

-- Create view for aggregated reaction counts
CREATE OR REPLACE VIEW post_reactions_aggregated AS
SELECT
  post_id,
  SUM(CASE WHEN emoji = '👍' THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN emoji = '❤️' THEN 1 ELSE 0 END) as heart,
  SUM(CASE WHEN emoji = '😂' THEN 1 ELSE 0 END) as laugh,
  SUM(CASE WHEN emoji = '😮' THEN 1 ELSE 0 END) as wow,
  SUM(CASE WHEN emoji = '😢' THEN 1 ELSE 0 END) as sad,
  SUM(CASE WHEN emoji = '👏' THEN 1 ELSE 0 END) as clap,
  COUNT(*) as total_reactions
FROM reactions
GROUP BY post_id;

-- Add comments
COMMENT ON TABLE reactions IS 'Emoji reactions to posts (replaces comments system)';
COMMENT ON COLUMN reactions.emoji IS 'One of 6 emoji types: 👍 ❤️ 😂 😮 😢 👏';
COMMENT ON VIEW post_reaction_stats IS 'Count of each emoji per post';
COMMENT ON VIEW post_reactions_aggregated IS 'Aggregated reaction counts for efficient queries';
