-- Migration: 005_add_session_hack_status.sql
-- افزودن وضعیت نفوذ سایبری مزداک و رهگیری قفل امنیتی کلاس‌ها
-- منطبق بر استانداردهای UMAC-P و DEC-0034

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_hacked TINYINT(1) DEFAULT 0 AFTER vault_target_week;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hacked_at DATETIME NULL AFTER is_hacked;
