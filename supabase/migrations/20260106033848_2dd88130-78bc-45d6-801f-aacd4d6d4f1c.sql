-- Add 'financial' to notification_type enum for cash handling notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'financial';