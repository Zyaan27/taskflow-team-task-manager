import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../api';
import {
  Modal, StatusBadge, PriorityBadge, EmptyState, Spinner,
  ErrorMsg, ConfirmModal, Select, Avatar
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { format, isAfter, parseISO, isBefore, addDays } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

const TaskFormModal = ({ isOpen, onClose, onSave, projectId, members, task = null, userRole }) => {
  const { user } = useAuth();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    dueDate: task?.due_date ? task.due_date.split('T')[0] : '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    assignedTo: task?.assigned_to || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        assignedTo: form.assignedTo || null,
        dueDate: form.dueDate || null,
      };

      let res;
      if (isEdit) {
        res = await tasksAPI.update(task.id, payload);
      } else {
        res = await tasksAPI.create(projectId, payload);
      }
      onSave(res.data, isEdit);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const canAssignOthers = userRole === 'admin';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            placeholder="Task title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="Details about this task..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <Select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <Select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'done', label: 'Done' },
              ]}
            />
          </div>
        </div>
        <div>
          <label className="label">Due Date</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        {canAssignOthers && (
          <div>
            <label className="label">Assign To</label>
            <Select
              value={form.assignedTo}
              onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map(m => ({ value: m.id, label: `${m.name} (${m.role})` })),
              ]}
            />
          </div>
        )}
        <ErrorMsg error={error} />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, userRole }) => {
  const { user } = useAuth();
  const isAdmin = userRole === 'admin';
  const isAssignee = task.assigned_to === user?.id;
  const canEdit = isAdmin || isAssignee;
  const isOverdue = task.due_date && task.status !== 'done' && isBefore(parseISO(task.due_date), new Date());
  const isDueSoon = task.due_date && task.status !== 'done' && !isOverdue
    && isBefore(parseISO(task.due_date), addDays(new Date(), 3));

  return (
    <div className={`card p-4 flex flex-col gap-3 hover:border-ink-500 transition-colors ${isOverdue ? 'border-rose-500/30' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-200 leading-snug">{task.title}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-slate-600 hover:text-slate-300 transition-colors text-xs px-1.5 py-0.5 hover:bg-ink-600 rounded"
            >
              ✎
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-slate-600 hover:text-rose-400 transition-colors text-xs px-1.5 py-0.5 hover:bg-rose-500/10 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={`text-xs font-mono ${isOverdue ? 'text-rose-400' : isDueSoon ? 'text-amber-300' : 'text-slate-500'}`}>
            {isOverdue ? '⚠ ' : isDueSoon ? '⏰ ' : ''}
            {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>

      {task.assigned_to_name && (
        <div className="flex items-center gap-2">
          <Avatar name={task.assigned_to_name} size="sm" />
          <span className="text-xs text-slate-500">{task.assigned_to_name}</span>
        </div>
      )}

      {/* Quick status change for assignee */}
      {isAssignee && task.status !== 'done' && (
        <button
          onClick={() => onStatusChange(task.id, task.status === 'todo' ? 'in_progress' : 'done')}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors text-left"
        >
          → Mark as {task.status === 'todo' ? 'In Progress' : 'Done'}
        </button>
      )}
    </div>
  );
};

export default function TasksPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      projectsAPI.getById(projectId),
      tasksAPI.getByProject(projectId),
    ])
      .then(([pRes, tRes]) => {
        setProject(pRes.data);
        setTasks(tRes.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const userRole = project?.user_role;
  const isAdmin = userRole === 'admin';

  const handleSave = (task, isEdit) => {
    if (isEdit) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } else {
      setTasks(prev => [task, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    await tasksAPI.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleStatusChange = async (id, status) => {
    const res = await tasksAPI.update(id, { status });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...res.data } : t));
  };

  const filteredTasks = tasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by status for kanban
  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = filteredTasks.filter(t => t.status === s);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/projects/${projectId}`} className="text-slate-500 hover:text-slate-300 text-sm">
            ← {project?.name}
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-semibold text-slate-100">Tasks</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            + New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input max-w-[200px]"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          className="max-w-[150px]"
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
          ]}
        />
        <Select
          value={filter.priority}
          onChange={e => setFilter({ ...filter, priority: e.target.value })}
          className="max-w-[150px]"
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
        />
        <span className="text-sm text-slate-500 ml-auto">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Board */}
      {filteredTasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="◎"
            title="No tasks found"
            description={isAdmin ? "Create the first task for this project." : "No tasks match your filters."}
            action={isAdmin && (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create Task
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 px-1">
                <StatusBadge status={status} />
                <span className="text-xs text-slate-600 font-mono ml-auto">
                  {grouped[status].length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {grouped[status].length === 0 ? (
                  <div className="border-2 border-dashed border-ink-700 rounded-xl h-20 flex items-center justify-center">
                    <span className="text-xs text-slate-700">No tasks</span>
                  </div>
                ) : (
                  grouped[status].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={setEditTask}
                      onDelete={setDeleteId}
                      onStatusChange={handleStatusChange}
                      userRole={userRole}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editTask) && (
        <TaskFormModal
          isOpen={true}
          onClose={() => { setShowCreate(false); setEditTask(null); }}
          onSave={handleSave}
          projectId={projectId}
          members={project?.members || []}
          task={editTask}
          userRole={userRole}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </div>
  );
}
