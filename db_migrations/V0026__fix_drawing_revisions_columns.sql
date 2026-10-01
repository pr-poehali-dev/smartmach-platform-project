ALTER TABLE t_p45794133_smartmach_platform_p.drawing_revisions
    ADD COLUMN IF NOT EXISTS change_note TEXT,
    ADD COLUMN IF NOT EXISTS objects_count INTEGER DEFAULT 0;