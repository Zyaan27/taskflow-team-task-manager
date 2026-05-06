const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, requireProjectMember } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', authenticate, requireProjectMember, async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    let query = `
      SELECT t.*,
        u.name AS assigned_to_name, u.email AS assigned_to_email,
        cu.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users cu ON t.created_by = cu.id
      WHERE t.project_id = $1
    `;
    const params = [req.params.projectId];
    let paramIdx = 2;

    if (status) {
      query += ` AND t.status = $${paramIdx++}`;
      params.push(status);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIdx++}`;
      params.push(priority);
    }
    if (assignedTo) {
      query += ` AND t.assigned_to = $${paramIdx++}`;
      params.push(assignedTo);
    }

    query += ' ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks — create task
router.post(
  '/projects/:projectId/tasks',
  authenticate,
  requireProjectMember,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('dueDate').optional().isISO8601().withMessage('Valid date required'),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('assignedTo').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, dueDate, priority = 'medium', assignedTo } = req.body;
    const projectId = req.params.projectId;

    // Only admins can assign tasks to others (members can only self-assign)
    if (assignedTo && req.projectRole !== 'admin' && parseInt(assignedTo) !== req.user.id) {
      return res.status(403).json({ message: 'Members can only assign tasks to themselves' });
    }

    // Validate assignee is a project member
    if (assignedTo) {
      const memberCheck = await pool.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, assignedTo]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Assignee must be a project member' });
      }
    }

    try {
      const result = await pool.query(
        `INSERT INTO tasks (project_id, title, description, due_date, priority, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [projectId, title, description || null, dueDate || null, priority, assignedTo || null, req.user.id]
      );

      const task = result.rows[0];

      // Fetch with user info
      const fullTask = await pool.query(
        `SELECT t.*, u.name AS assigned_to_name, cu.name AS created_by_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users cu ON t.created_by = cu.id
         WHERE t.id = $1`,
        [task.id]
      );

      res.status(201).json(fullTask.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/tasks/:id — get single task
router.get('/tasks/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, cu.name AS created_by_name,
        p.name AS project_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users cu ON t.created_by = cu.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const task = result.rows[0];
    // Verify user is a member
    const memberCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [task.project_id, req.user.id]
    );
    if (memberCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    res.json({ ...task, userRole: memberCheck.rows[0].role });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/tasks/:id — update task
router.put(
  '/tasks/:id',
  authenticate,
  [
    body('title').optional().trim().notEmpty(),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
      if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

      const task = taskResult.rows[0];

      // Check membership
      const memberResult = await pool.query(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [task.project_id, req.user.id]
      );
      if (memberResult.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

      const userRole = memberResult.rows[0].role;

      // Members can only update status of their own tasks
      if (userRole === 'member') {
        if (task.assigned_to !== req.user.id) {
          return res.status(403).json({ message: 'You can only update tasks assigned to you' });
        }
        const { status } = req.body;
        if (!status) return res.status(400).json({ message: 'Members can only update status' });

        const updated = await pool.query(
          'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
          [status, req.params.id]
        );
        return res.json(updated.rows[0]);
      }

      // Admin can update everything
      const { title, description, dueDate, priority, status, assignedTo } = req.body;

      // Validate assignee if changing
      if (assignedTo !== undefined && assignedTo !== null) {
        const memberCheck = await pool.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
          [task.project_id, assignedTo]
        );
        if (memberCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Assignee must be a project member' });
        }
      }

      const updated = await pool.query(
        `UPDATE tasks SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = $3,
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          assigned_to = $6
         WHERE id = $7
         RETURNING *`,
        [
          title || null,
          description !== undefined ? description : null,
          dueDate !== undefined ? dueDate : task.due_date,
          priority || null,
          status || null,
          assignedTo !== undefined ? assignedTo : task.assigned_to,
          req.params.id,
        ]
      );

      const fullTask = await pool.query(
        `SELECT t.*, u.name AS assigned_to_name, cu.name AS created_by_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users cu ON t.created_by = cu.id
         WHERE t.id = $1`,
        [updated.rows[0].id]
      );

      res.json(fullTask.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/tasks/:id — delete task (admin only)
router.delete('/tasks/:id', authenticate, async (req, res) => {
  try {
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (taskResult.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const task = taskResult.rows[0];
    const memberResult = await pool.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'admin'",
      [task.project_id, req.user.id]
    );
    if (memberResult.rows.length === 0) return res.status(403).json({ message: 'Admin access required' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
