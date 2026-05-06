const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects — list projects user is a member of
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role AS user_role,
        u.name AS creator_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') AS done_count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       JOIN users u ON p.created_by = u.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects — create a new project
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const projectResult = await client.query(
        'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
        [name, description || null, req.user.id]
      );
      const project = projectResult.rows[0];

      // Creator becomes admin
      await client.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [project.id, req.user.id, 'admin']
      );

      await client.query('COMMIT');
      res.status(201).json({ ...project, user_role: 'admin' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// GET /api/projects/:id — get project details
router.get('/:id', authenticate, requireProjectMember, async (req, res) => {
  try {
    const projectResult = await pool.query(
      `SELECT p.*, pm.role AS user_role, u.name AS creator_name
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
       JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [req.params.id, req.user.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
       FROM users u JOIN project_members pm ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.role DESC, u.name ASC`,
      [req.params.id]
    );

    res.json({
      ...projectResult.rows[0],
      members: membersResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id — update project (admin only)
router.put(
  '/:id',
  authenticate,
  requireProjectAdmin,
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description } = req.body;
    try {
      const result = await pool.query(
        'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [name, description || null, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/projects/:id — delete project (admin only)
router.delete('/:id', authenticate, requireProjectAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:id/members — add a member (admin only)
router.post(
  '/:id/members',
  authenticate,
  requireProjectAdmin,
  [
    body('userId').isInt().withMessage('Valid user ID required'),
    body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { userId, role = 'member' } = req.body;

    try {
      const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const existing = await pool.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [req.params.id, userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'User is already a member' });
      }

      await pool.query(
        'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
        [req.params.id, userId, role]
      );

      res.status(201).json({ ...userCheck.rows[0], role });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/projects/:id/members/:userId — remove a member (admin only)
router.delete('/:id/members/:userId', authenticate, requireProjectAdmin, async (req, res) => {
  const { userId } = req.params;

  // Prevent removing yourself if you're the only admin
  if (parseInt(userId) === req.user.id) {
    const adminCount = await pool.query(
      "SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND role = 'admin'",
      [req.params.id]
    );
    if (parseInt(adminCount.rows[0].count) <= 1) {
      return res.status(400).json({ message: 'Cannot remove the only admin' });
    }
  }

  try {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id/members/:userId/role — change member role (admin only)
router.put(
  '/:id/members/:userId/role',
  authenticate,
  requireProjectAdmin,
  [body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      await pool.query(
        'UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3',
        [req.body.role, req.params.id, req.params.userId]
      );
      res.json({ message: 'Role updated' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
