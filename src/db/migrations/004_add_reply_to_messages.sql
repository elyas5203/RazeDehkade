-- 004_add_reply_to_messages.sql
-- اضافه کردن ستون reply_to_id به جدول messages جهت پیاده‌سازی قابلیت ریپلای دوطرفه
-- منطبق بر استانداردهای UMAC-P و DEC-0026

ALTER TABLE messages ADD COLUMN reply_to_id INT NULL DEFAULT NULL AFTER sender_id;

-- برقراری قید کلید خارجی خودارجاعی با سیاست حذف ایمن (ON DELETE SET NULL)
-- در صورت حذف پیام مرجع، پیام‌های ریپلای شده آسیب ندیده و فقط ارجاع آن‌ها نال می‌شود
ALTER TABLE messages ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- ایجاد ایندکس اختصاصی جهت شتاب‌بخشی به واکشی تاریخچه و کوئری‌های جوین
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
