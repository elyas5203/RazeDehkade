const { query, pool } = require('./src/db/pool');

async function run() {
  try {
    const weekly = await query("SELECT id, week_number, step_order, content_type, title, payload FROM weekly_content ORDER BY week_number, step_order LIMIT 20");
    console.log("=== WEEKLY CONTENT ===");
    console.log(JSON.stringify(weekly.rows || weekly, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    if (pool && pool.end) await pool.end();
  }
}

run();
