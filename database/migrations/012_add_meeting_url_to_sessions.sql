-- Migration: Add meeting URL and expiry to sessions table
-- Created: 2026-03-24
-- Description: Enhances sessions table with meeting URL, provider info, and expiry tracking

-- Add meeting-related columns if they don't exist
DO $$ 
BEGIN
    -- Add meeting_url column if it doesn't exist (it may already exist from test setup)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sessions' AND column_name = 'meeting_url') THEN
        ALTER TABLE sessions ADD COLUMN meeting_url VARCHAR(500);
    END IF;

    -- Add meeting_provider column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sessions' AND column_name = 'meeting_provider') THEN
        ALTER TABLE sessions ADD COLUMN meeting_provider VARCHAR(50);
    END IF;

    -- Add meeting_room_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sessions' AND column_name = 'meeting_room_id') THEN
        ALTER TABLE sessions ADD COLUMN meeting_room_id VARCHAR(255);
    END IF;

    -- Add meeting_expires_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sessions' AND column_name = 'meeting_expires_at') THEN
        ALTER TABLE sessions ADD COLUMN meeting_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add needs_manual_intervention flag for failed meeting creations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sessions' AND column_name = 'needs_manual_intervention') THEN
        ALTER TABLE sessions ADD COLUMN needs_manual_intervention BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_meeting_url ON sessions(meeting_url) WHERE meeting_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_meeting_expires_at ON sessions(meeting_expires_at) WHERE meeting_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_needs_manual_intervention ON sessions(needs_manual_intervention) WHERE needs_manual_intervention = TRUE;

-- Add comment to document the columns
COMMENT ON COLUMN sessions.meeting_url IS 'Video meeting room URL generated on booking confirmation';
COMMENT ON COLUMN sessions.meeting_provider IS 'Meeting provider used (daily, whereby, zoom, jitsi)';
COMMENT ON COLUMN sessions.meeting_room_id IS 'Provider-specific room ID for API operations';
COMMENT ON COLUMN sessions.meeting_expires_at IS 'Timestamp when meeting room expires (30 min after session end)';
COMMENT ON COLUMN sessions.needs_manual_intervention IS 'Flag indicating meeting creation failed and requires manual setup';

-- Update existing sessions' meeting_link to meeting_url if needed (data migration)
UPDATE sessions SET meeting_url = meeting_link WHERE meeting_link IS NOT NULL AND meeting_url IS NULL;
