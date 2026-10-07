-- Migration: 002_features_update.sql
-- جدول معلمان / مدرسان (Teachers)
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NULL,
    session_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- جدول محتوای ۵ هفته سناریو (Weekly Content)
CREATE TABLE IF NOT EXISTS weekly_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    week_number TINYINT NOT NULL,
    step_order INT NOT NULL,
    content_type VARCHAR(20) NOT NULL, -- 'text', 'image', 'video', 'voice', 'file'
    title VARCHAR(150) NOT NULL,
    payload TEXT NOT NULL,
    file_name VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
