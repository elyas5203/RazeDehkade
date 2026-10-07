const fs = require('fs');
let auth = fs.readFileSync('src/routes/auth.js', 'utf8');
auth = auth.replace(/if\s*\(session\.status === 'waiting'\)\s*\{\s*await Session\.updateStatus\(session\.id, 'active'\);\s*\}/, 
`if (session.status === 'waiting') {
      await Session.updateStatus(session.id, 'active');
      session.status = 'active';
    }
    const caseStatuses = await Session.getCaseStatuses(session.id);`);
auth = auth.replace(/const token = generateToken\(\{[\s\S]*?\}\);/,
`const token = generateToken({
      sessionId: session.id,
      sessionCode: session.chat_code || session.code,
      role: 'user',
      name: session.name,
      activeCase: session.active_case,
    });`);
auth = auth.replace(/session:\s*\{[\s\S]*?\},/,
`session: {
          id: session.id,
          code: session.chat_code || session.code,
          name: session.name,
          status: session.status,
          active_case: session.active_case,
          cases: caseStatuses,
        },`);
fs.writeFileSync('src/routes/auth.js', auth);

let sessJs = fs.readFileSync('src/routes/sessions.js', 'utf8');
const casesEndpoints = `
/**
 * PUT /api/sessions/:id/cases
 * Update active case and case statuses
 */
router.put('/:id/cases', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { active_case, cases } = req.body;
    
    if (active_case !== undefined) {
      await Session.setActiveCase(sessionId, active_case);
    }
    
    if (cases && Array.isArray(cases)) {
      for (const c of cases) {
        if (c.case_key && c.status) {
          await Session.setCaseStatus(sessionId, c.case_key, c.status);
        }
      }
    }
    
    const session = await Session.findById(sessionId);
    const caseStatuses = await Session.getCaseStatuses(sessionId);
    
    return res.json({
      success: true,
      message: 'Cases updated successfully',
      data: {
        ...session,
        cases: caseStatuses
      }
    });
  } catch (error) {
    console.error('Error updating cases:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
`;

if (!sessJs.includes('router.put(\'/:id/cases\'')) {
  sessJs = sessJs.replace('module.exports = router;', casesEndpoints + '\nmodule.exports = router;');
  fs.writeFileSync('src/routes/sessions.js', sessJs);
}

// Modify findAll in sessions.js to include cases
// Wait, for admin, it's easier to just fetch cases in findAll or get them when clicking a session.
// Let's modify findAll to return cases as well.
let sessModel = fs.readFileSync('src/models/Session.js', 'utf8');
if (!sessModel.includes('session_cases c')) {
    sessModel = sessModel.replace(/static async findAll\(\) \{[\s\S]*?return res\.rows;\s*\}/, 
    `static async findAll() {
    const res = await query(
      \`SELECT s.*, a.display_name as assigned_admin_name,
              (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.is_read = 0 AND m.sender_type = 'user') as unread_count
       FROM sessions s
       LEFT JOIN admins a ON s.assigned_admin_id = a.id
       ORDER BY s.last_activity_at DESC\`
    );
    const sessions = res.rows;
    for (let s of sessions) {
      const c = await query(\`SELECT * FROM session_cases WHERE session_id = ?\`, [s.id]);
      s.cases = c.rows;
    }
    return sessions;
  }`);
  fs.writeFileSync('src/models/Session.js', sessModel);
}

