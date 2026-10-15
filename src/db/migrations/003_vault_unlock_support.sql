-- Migration: 003_vault_unlock_support.sql
-- افزودن ستون‌های کنترل بازگشایی گاوصندوق در هفته مشخص
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_vault_unlocked TINYINT(1) DEFAULT 0 AFTER teacher_phone;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vault_target_week TINYINT DEFAULT 5 AFTER is_vault_unlocked;
