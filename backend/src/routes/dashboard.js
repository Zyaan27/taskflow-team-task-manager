const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — overall dashboard for the current user
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    // Projects user belongs to
    const projectsResult = await pool.query(
      `SELECT p.id, p.name, pm.role
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1`,
      [userId]
    );
    const projects = projectsResult.rows;
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return res.json({
        totalTasks: 0,
        tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
        tasksByPriority: { low: 0, medium: 0, high: 0 },
        overdueTasks: [],
        tasksByUser: [],
        recentTasks: [],
        projects: [],
      });
    }

    // Total tasks in user's projects
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE project_id = ANY($1)`,
      [projectIds]
    );

    // Tasks by status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) FROM tasks WHERE project_id = ANY($1) GROUP BY status`,
      [projectIds]
    );

    // Tasks by priority
    const priorityResult = await pool.query(
      `SELECT priority, COUNT(*) FROM tasks WHERE project_id = ANY($1) GROUP BY priority`,
      [projectIds]
    );

    // Overdue tasks (due_date < today, not done)
    const overdueResult = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assigned_to_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.project_id = ANY($1)
         AND t.due_date < CURRENT_DATE
         AND t.status != 'done'
       ORDER BY t.due_date ASC
       LIMIT 10`,
      [projectIds]
    );

    // Tasks per user (assignee breakdown)
    const perUserResult = await pool.query(
      `SELECT u.id, u.name,
        COUNT(t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks
       FROM users u
       JOIN tasks t ON u.id = t.assigned_to
       WHERE t.project_id = ANY($1)
       GROUP BY u.id, u.name
       ORDER BY total_tasks DESC
       LIMIT 10`,
      [projectIds]
    );

    // Recent tasks (last 5)
    const recentResult = await pool.query(
      `SELECT t.*, p.name AS project_name, u.name AS assigned_to_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.project_id = ANY($1)
       ORDER BY t.created_at DESC
       LIMIT 5`,
      [projectIds]
    );

    // My assigned tasks
    const myTasksResult = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_to = $1 AND t.status != 'done'
       ORDER BY t.due_date ASC NULLS LAST
       LIMIT 5`,
      [userId]
    );

    const tasksByStatus = { todo: 0, in_progress: 0, done: 0 };
    statusResult.rows.forEach((r) => { tasksByStatus[r.status] = parseInt(r.count); });

    const tasksByPriority = { low: 0, medium: 0, high: 0 };
    priorityResult.rows.forEach((r) => { tasksByPriority[r.priority] = parseInt(r.count); });

    res.json({
      totalTasks: parseInt(totalResult.rows[0].count),
      tasksByStatus,
      tasksByPriority,
      overdueTasks: overdueResult.rows,
      tasksByUser: perUserResult.rows,
      recentTasks: recentResult.rows,
      myTasks: myTasksResult.rows,
      projects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
