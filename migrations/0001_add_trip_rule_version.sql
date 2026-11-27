-- Add rule_version column to trips so historical trips preserve v1 calculation rules
-- while new trips use v2 (Townhall PK rules: max 50% shared driver discount per vehicle per leg + 0.1 single-trip-only fee).
ALTER TABLE trips ADD COLUMN rule_version INTEGER NOT NULL DEFAULT 1;
