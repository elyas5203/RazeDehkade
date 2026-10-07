/**
 * src/db/pool.js
 * مدیریت اتصال به دیتابیس MySQL با mysql2/promise
 * شامل پیاده‌سازی شبیه‌ساز حافظه‌ای (In-Memory Mock Database) برای تست‌های اتوماتیک
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isMemoryDb = false;

// شبیه‌ساز ساده دیتابیس در حافظه برای محیط تست
class InMemoryDatabase {
  constructor() {
    this.isMemoryDb = true;
    this.tables = {
      admins: [],
      sessions: [],
      messages: [],
      canned_responses: [],
      session_logs: [],
      session_cases: [],
      media_registry: [],
      teachers: [],
      weekly_content: [],
    };
    this.autoIds = {
      admins: 1,
      sessions: 1,
      messages: 1,
      canned_responses: 1,
      session_logs: 1,
      session_cases: 1,
      media_registry: 1,
      teachers: 1,
      weekly_content: 1,
    };
  }

  async execute(sqlText, params = []) {
    return this.query(sqlText, params);
  }

  async query(sqlText, params = []) {
    const cleanSql = sqlText.replace(/\s+/g, ' ').trim();

    // 1. CREATE TABLE
    if (/^CREATE TABLE/i.test(cleanSql)) {
      return [{ affectedRows: 0, insertId: 0 }, []];
    }

    // 2. INSERT INTO admins
    if (/^INSERT INTO admins/i.test(cleanSql)) {
      const [username, password_hash, display_name] = params;
      const id = this.autoIds.admins++;
      const record = {
        id,
        username,
        password_hash,
        display_name,
        is_active: 1,
        created_at: new Date(),
      };
      this.tables.admins.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    // 3. SELECT FROM admins
    if (/^SELECT .* FROM admins/i.test(cleanSql)) {
      if (/WHERE username = \?/i.test(cleanSql)) {
        const rows = this.tables.admins.filter(a => a.username === params[0]);
        return [rows, []];
      }
      if (/WHERE id = \?/i.test(cleanSql)) {
        const rows = this.tables.admins.filter(a => a.id == params[0]);
        return [rows, []];
      }
      return [this.tables.admins, []];
    }

    // 4. INSERT INTO sessions
    if (/^INSERT INTO sessions/i.test(cleanSql)) {
      let code, order_code, chat_code, name, assigned_admin_id;
      if (params.length === 5) {
        [code, order_code, chat_code, name, assigned_admin_id] = params;
      } else {
        [code, name, assigned_admin_id] = params;
        order_code = code;
        chat_code = code;
      }
      const id = this.autoIds.sessions++;
      const record = {
        id,
        code: chat_code || code,
        order_code: order_code || code,
        chat_code: chat_code || code,
        name,
        status: 'waiting',
        assigned_admin_id,
        created_at: new Date(),
        updated_at: new Date(),
        last_activity_at: new Date(),
        order_started_at: null,
        order_expires_at: null,
        active_case: 'village',
        is_chat_locked: 0,
        teacher_phone: null,
      };
      this.tables.sessions.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    // 5. SELECT FROM sessions
    if (/^SELECT COUNT\(\*\)/i.test(cleanSql) && /FROM sessions/i.test(cleanSql)) {
      const count = this.tables.sessions.filter(s => ['waiting', 'active'].includes(s.status)).length;
      return [[{ count }], []];
    }

    if (/^SELECT .* FROM sessions/i.test(cleanSql)) {
      if (/WHERE teacher_phone = \?/i.test(cleanSql)) {
        const cleanPhone = String(params[0] || '').trim();
        const s = this.tables.sessions.find(x => x.teacher_phone === cleanPhone && ['waiting', 'active'].includes(x.status));
        return [s ? [s] : [], []];
      }
      if (/is_chat_locked FROM sessions WHERE id = \?/i.test(cleanSql)) {
        const s = this.tables.sessions.find(x => x.id == params[0]);
        return [s ? [{ is_chat_locked: s.is_chat_locked ? 1 : 0 }] : [], []];
      }
      if (/WHERE s\.id = \?/i.test(cleanSql) || /WHERE id = \?/i.test(cleanSql)) {
        const s = this.tables.sessions.find(x => x.id == params[0]);
        if (!s) return [[], []];
        const admin = this.tables.admins.find(a => a.id == s.assigned_admin_id);
        return [[{ ...s, assigned_admin_name: admin ? admin.display_name : null }], []];
      }
      if (/WHERE s\.chat_code = \?/i.test(cleanSql) || /WHERE s\.order_code = \?/i.test(cleanSql) || /WHERE s\.code = \?/i.test(cleanSql) || /WHERE code = \?/i.test(cleanSql)) {
        let s;
        if (/WHERE s\.chat_code = \?/i.test(cleanSql)) {
          s = this.tables.sessions.find(x => x.chat_code == params[0]);
        } else if (/WHERE s\.order_code = \?/i.test(cleanSql)) {
          s = this.tables.sessions.find(x => x.order_code == params[0]);
        } else {
          s = this.tables.sessions.find(x => x.code == params[0]);
        }
        if (!s) return [[], []];
        const admin = this.tables.admins.find(a => a.id == s.assigned_admin_id);
        return [[{ ...s, assigned_admin_name: admin ? admin.display_name : null }], []];
      }
      // findAll
      const list = this.tables.sessions.map(s => {
        const admin = this.tables.admins.find(a => a.id == s.assigned_admin_id);
        const unread_count = this.tables.messages.filter(m => m.session_id == s.id && !m.is_read && m.sender_type === 'user').length;
        return { ...s, assigned_admin_name: admin ? admin.display_name : null, unread_count };
      });
      return [list, []];
    }

    // 6. UPDATE sessions
    if (/^UPDATE sessions SET name =/i.test(cleanSql)) {
      const [name, status, active_case, id] = params;
      const s = this.tables.sessions.find(x => x.id == id);
      if (s) {
        if (name) s.name = name;
        if (status) s.status = status;
        if (active_case) s.active_case = active_case;
        s.updated_at = new Date();
        s.last_activity_at = new Date();
      }
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^DELETE FROM sessions/i.test(cleanSql)) {
      const [id] = params;
      const idx = this.tables.sessions.findIndex(x => x.id == id);
      if (idx > -1) {
        this.tables.sessions.splice(idx, 1);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    if (/^UPDATE sessions SET status/i.test(cleanSql)) {
      const [status, id] = params;
      const s = this.tables.sessions.find(x => x.id == id);
      if (s) {
        s.status = status;
        s.updated_at = new Date();
        s.last_activity_at = new Date();
      }
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^UPDATE sessions SET last_activity_at/i.test(cleanSql)) {
      const [id] = params;
      const s = this.tables.sessions.find(x => x.id == id);
      if (s) s.last_activity_at = new Date();
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^UPDATE sessions SET assigned_admin_id/i.test(cleanSql)) {
      const [adminId, sessionId] = params;
      const s = this.tables.sessions.find(x => x.id == sessionId);
      if (s) {
        s.assigned_admin_id = adminId;
        s.status = 'active';
        s.updated_at = new Date();
      }
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^UPDATE sessions SET active_case/i.test(cleanSql)) {
      const [caseKey, sessionId] = params;
      const s = this.tables.sessions.find(x => x.id == sessionId);
      if (s) s.active_case = caseKey;
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^UPDATE sessions SET order_started_at/i.test(cleanSql)) {
      const [sessionId] = params;
      const s = this.tables.sessions.find(x => x.id == sessionId);
      const now = new Date();
      if (!s || (s.order_expires_at && new Date(s.order_expires_at) > now)) {
        return [{ affectedRows: 0 }, []];
      }
      s.order_started_at = now;
      s.order_expires_at = new Date(now.getTime() + 45000);
      s.last_activity_at = now;
      return [{ affectedRows: 1 }, []];
    }

    if (/^UPDATE sessions SET is_chat_locked/i.test(cleanSql)) {
      const [isLocked, id] = params;
      const s = this.tables.sessions.find(x => x.id == id);
      if (s) {
        s.is_chat_locked = isLocked ? 1 : 0;
        s.updated_at = new Date();
      }
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^UPDATE sessions SET teacher_phone/i.test(cleanSql)) {
      const [phone, id] = params;
      const s = this.tables.sessions.find(x => x.id == id);
      if (s) {
        s.teacher_phone = phone;
        s.updated_at = new Date();
      }
      return [{ affectedRows: s ? 1 : 0 }, []];
    }

    if (/^INSERT INTO session_cases/i.test(cleanSql)) {
      const [session_id, case_key, status] = params;
      let record = this.tables.session_cases.find(c => c.session_id == session_id && c.case_key === case_key);
      if (record) record.status = status;
      else {
        record = { id: this.autoIds.session_cases++, session_id, case_key, status, started_at: new Date(), completed_at: null };
        this.tables.session_cases.push(record);
      }
      return [{ affectedRows: 1, insertId: record.id }, []];
    }

    if (/^SELECT .* FROM session_cases/i.test(cleanSql)) {
      return [this.tables.session_cases.filter(c => c.session_id == params[0]), []];
    }

    // 7. INSERT INTO messages
    if (/^INSERT INTO messages/i.test(cleanSql)) {
      const [session_id, sender_type, sender_id, content, message_type, file_url, file_name] = params;
      const id = this.autoIds.messages++;
      const record = {
        id,
        session_id,
        sender_type,
        sender_id,
        content,
        message_type,
        file_url,
        file_name,
        is_read: 0,
        created_at: new Date(),
      };
      this.tables.messages.push(record);

      const s = this.tables.sessions.find(x => x.id == session_id);
      if (s) s.last_activity_at = new Date();

      return [{ affectedRows: 1, insertId: id }, []];
    }

    // 8. SELECT FROM messages
    if (/^SELECT .* FROM messages/i.test(cleanSql)) {
      if (/WHERE m\.id = \?/i.test(cleanSql) || /WHERE id = \?/i.test(cleanSql)) {
        const m = this.tables.messages.find(x => x.id == params[0]);
        return [m ? [m] : [], []];
      }
      if (/WHERE m\.session_id = \?/i.test(cleanSql) || /WHERE session_id = \?/i.test(cleanSql)) {
        const session_id = params[0];
        const msgs = this.tables.messages.filter(m => m.session_id == session_id).map(m => {
          const admin = this.tables.admins.find(a => a.id == m.sender_id);
          return { ...m, admin_sender_name: admin ? admin.display_name : null };
        });
        return [msgs, []];
      }
    }

    // 9. UPDATE messages SET is_read
    if (/^UPDATE messages SET is_read = 1/i.test(cleanSql)) {
      const [session_id, sender_type] = params;
      let count = 0;
      this.tables.messages.forEach(m => {
        if (m.session_id == session_id && m.sender_type == sender_type && !m.is_read) {
          m.is_read = 1;
          count++;
        }
      });
      return [{ affectedRows: count }, []];
    }

    if (/^UPDATE messages SET content = \?/i.test(cleanSql)) {
      const [newContent, id] = params;
      const msg = this.tables.messages.find(m => m.id == id);
      if (msg) {
        msg.content = newContent;
        msg.updated_at = new Date();
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    if (/^DELETE FROM messages WHERE id = \?/i.test(cleanSql)) {
      const [id] = params;
      const idx = this.tables.messages.findIndex(m => m.id == id);
      if (idx > -1) {
        this.tables.messages.splice(idx, 1);
        return [{ affectedRows: 1 }, []];
      }
      return [{ affectedRows: 0 }, []];
    }

    // 10. Canned Responses
    if (/^INSERT INTO canned_responses/i.test(cleanSql)) {
      const [admin_id, title, content, sort_order] = params;
      const id = this.autoIds.canned_responses++;
      const record = { id, admin_id, title, content, sort_order, created_at: new Date() };
      this.tables.canned_responses.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    if (/^SELECT .* FROM canned_responses/i.test(cleanSql)) {
      if (/WHERE id = \?/i.test(cleanSql)) {
        const c = this.tables.canned_responses.find(x => x.id == params[0]);
        return [c ? [c] : [], []];
      }
      return [this.tables.canned_responses, []];
    }

    if (/^UPDATE canned_responses/i.test(cleanSql)) {
      const [title, content, sort_order, id] = params;
      const c = this.tables.canned_responses.find(x => x.id == id);
      if (c) {
        if (title !== null && title !== undefined) c.title = title;
        if (content !== null && content !== undefined) c.content = content;
        if (sort_order !== null && sort_order !== undefined) c.sort_order = sort_order;
      }
      return [{ affectedRows: c ? 1 : 0 }, []];
    }

    if (/^DELETE FROM canned_responses/i.test(cleanSql)) {
      const [id] = params;
      const idx = this.tables.canned_responses.findIndex(x => x.id == id);
      let deleted = null;
      if (idx !== -1) {
        deleted = this.tables.canned_responses.splice(idx, 1)[0];
      }
      return [{ affectedRows: deleted ? 1 : 0 }, []];
    }

    // 11. Session Logs
    if (/^INSERT INTO session_logs/i.test(cleanSql)) {
      const [session_id, event_type, details] = params;
      const id = this.autoIds.session_logs++;
      const record = { id, session_id, event_type, details, created_at: new Date() };
      this.tables.session_logs.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    if (/^SELECT .* FROM session_logs/i.test(cleanSql)) {
      const logs = this.tables.session_logs.filter(l => l.session_id == params[0]);
      return [logs, []];
    }

    // 12. Media Registry
    if (/^INSERT INTO media_registry/i.test(cleanSql)) {
      const [name, type, title] = params;
      const id = this.autoIds.media_registry++;
      const record = { id, name, type, title, created_at: new Date() };
      this.tables.media_registry.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    if (/^SELECT .* FROM media_registry/i.test(cleanSql)) {
      if (/WHERE id = \?/i.test(cleanSql)) {
        const c = this.tables.media_registry.find(x => x.id == params[0]);
        return [c ? [c] : [], []];
      }
      return [this.tables.media_registry.sort((a, b) => b.id - a.id), []];
    }

    if (/^DELETE FROM media_registry/i.test(cleanSql)) {
      const [id] = params;
      const idx = this.tables.media_registry.findIndex(x => x.id == id);
      let deleted = null;
      if (idx !== -1) {
        deleted = this.tables.media_registry.splice(idx, 1)[0];
      }
      return [{ affectedRows: deleted ? 1 : 0 }, []];
    }

    // 13. Teachers
    if (/^INSERT INTO teachers/i.test(cleanSql)) {
      const [phone, full_name, session_id] = params;
      let record = this.tables.teachers.find(t => t.phone === phone);
      if (record) {
        if (session_id) record.session_id = session_id;
        if (full_name) record.full_name = full_name;
        return [{ affectedRows: 1, insertId: record.id }, []];
      }
      const id = this.autoIds.teachers++;
      record = { id, phone, full_name, session_id, created_at: new Date() };
      this.tables.teachers.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    if (/^SELECT .* FROM teachers/i.test(cleanSql)) {
      if (/WHERE (?:t\.)?phone = \?/i.test(cleanSql)) {
        const cleanPhone = String(params[0] || '').trim();
        const t = this.tables.teachers.find(x => x.phone === cleanPhone);
        if (!t) return [[], []];
        const s = t.session_id ? this.tables.sessions.find(x => x.id == t.session_id) : null;
        return [[{
          ...t,
          chat_code: s ? (s.chat_code || s.code) : null,
          order_code: s ? s.order_code : null,
          session_name: s ? s.name : null,
        }], []];
      }
      const list = this.tables.teachers.map(t => {
        const s = t.session_id ? this.tables.sessions.find(x => x.id == t.session_id) : null;
        return {
          ...t,
          chat_code: s ? (s.chat_code || s.code) : null,
          session_name: s ? s.name : null,
        };
      });
      return [list, []];
    }

    if (/^UPDATE teachers/i.test(cleanSql)) {
      const [session_id, full_name, id] = params;
      const t = this.tables.teachers.find(x => x.id == id);
      if (t) {
        if (session_id !== undefined && session_id !== null) t.session_id = session_id;
        if (full_name !== undefined && full_name !== null) t.full_name = full_name;
      }
      return [{ affectedRows: t ? 1 : 0 }, []];
    }

    // 14. Weekly Content
    if (/^INSERT INTO weekly_content/i.test(cleanSql)) {
      const [week_number, step_order, content_type, title, payload, file_name] = params;
      const id = this.autoIds.weekly_content++;
      const record = { id, week_number, step_order, content_type, title, payload, file_name, created_at: new Date() };
      this.tables.weekly_content.push(record);
      return [{ affectedRows: 1, insertId: id }, []];
    }

    if (/^SELECT .* FROM weekly_content/i.test(cleanSql)) {
      if (/WHERE week_number = \?/i.test(cleanSql)) {
        const items = this.tables.weekly_content.filter(x => x.week_number == params[0]).sort((a, b) => a.step_order - b.step_order);
        return [items, []];
      }
      if (/WHERE id = \?/i.test(cleanSql)) {
        const item = this.tables.weekly_content.find(x => x.id == params[0]);
        return [item ? [item] : [], []];
      }
      return [this.tables.weekly_content.sort((a, b) => (a.week_number - b.week_number) || (a.step_order - b.step_order)), []];
    }

    if (/^UPDATE weekly_content/i.test(cleanSql)) {
      const [week_number, step_order, content_type, title, payload, file_name, id] = params;
      const item = this.tables.weekly_content.find(x => x.id == id);
      if (item) {
        if (week_number !== undefined && week_number !== null) item.week_number = week_number;
        if (step_order !== undefined && step_order !== null) item.step_order = step_order;
        if (content_type) item.content_type = content_type;
        if (title) item.title = title;
        if (payload) item.payload = payload;
        if (file_name !== undefined) item.file_name = file_name;
      }
      return [{ affectedRows: item ? 1 : 0 }, []];
    }

    if (/^DELETE FROM weekly_content/i.test(cleanSql)) {
      const [id] = params;
      const idx = this.tables.weekly_content.findIndex(x => x.id == id);
      let deleted = null;
      if (idx !== -1) {
        deleted = this.tables.weekly_content.splice(idx, 1)[0];
      }
      return [{ affectedRows: deleted ? 1 : 0 }, []];
    }

    return [[], []];
  }

  async end() {
    return Promise.resolve();
  }
}

if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true') {
  pool = new InMemoryDatabase();
  isMemoryDb = true;
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'detective_game',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

/**
 * اجرای کوئری در MySQL
 * @param {string} text - متن SQL
 * @param {Array} params - پارامترها
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    // استفاده از pool.query جهت پشتیبانی کامل همزمان از DDL (مثل CREATE TABLE) و کوئری‌های معمولی در MySQL
    const [rows, fields] = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration });
    }
    return { rows, fields, insertId: rows ? rows.insertId : null, affectedRows: rows ? rows.affectedRows : 0 };
  } catch (err) {
    console.error('Database Query Error:', err.message);
    throw err;
  }
};

module.exports = {
  pool,
  query,
  isMemoryDb,
};
