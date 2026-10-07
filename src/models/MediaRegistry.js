const { query } = require('../db/pool');

class MediaRegistry {
  static async create({ name, type, title }) {
    const { insertId } = await query(
      `INSERT INTO media_registry (name, type, title) VALUES (?, ?, ?)`,
      [name, type, title]
    );
    return this.findById(insertId);
  }

  static async findById(id) {
    const { rows } = await query(`SELECT * FROM media_registry WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findAll() {
    const { rows } = await query(`SELECT * FROM media_registry ORDER BY id DESC`);
    return rows;
  }

  static async delete(id) {
    await query(`DELETE FROM media_registry WHERE id = ?`, [id]);
    return true;
  }
}

module.exports = MediaRegistry;
