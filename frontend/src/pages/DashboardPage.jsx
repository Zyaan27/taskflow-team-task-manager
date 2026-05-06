import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, Spinner, EmptyState } from '../components/ui';
import { format, isAfter, parseISO } from 'date-fns';

const StatCard = ({ label, value, sub, color = 'violet', icon }) => {
  const colors = {
    violet: 'text-violet-400',
    amber: 'text-amber-300',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    sky: 'text-sky-400',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${colors[color]} font-mono`}>{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );
};

const ProgressBar = ({ value, max, color = 'bg-violet-500' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-ink-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right font-mono">{pct}%</span>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardAPI.get()
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );

  if (error) return <div className="text-rose-400 text-sm">{error}</div>;

  const { totalTasks, tasksByStatus, tasksByPriority, overdueTasks, tasksByUser, recentTasks, myTasks } = data;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={totalTasks} icon="◎" color="violet" />
        <StatCard label="To Do" value={tasksByStatus.todo} icon="○" color="sky" />
        <StatCard label="In Progress" value={tasksByStatus.in_progress} icon="◑" color="amber" />
        <StatCard label="Done" value={tasksByStatus.done} icon="●" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="card p-5 col-span-1">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Status Breakdown</h2>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>To Do</span>
                <span className="font-mono">{tasksByStatus.todo}</span>
              </div>
              <ProgressBar value={tasksByStatus.todo} max={totalTasks} color="bg-sky-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>In Progress</span>
                <span className="font-mono">{tasksByStatus.in_progress}</span>
              </div>
              <ProgressBar value={tasksByStatus.in_progress} max={totalTasks} color="bg-amber-400" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Done</span>
                <span className="font-mono">{tasksByStatus.done}</span>
              </div>
              <ProgressBar value={tasksByStatus.done} max={totalTasks} color="bg-emerald-500" />
            </div>
          </div>

          <div className="border-t border-ink-600 mt-5 pt-5">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Priority</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'High', key: 'high', color: 'bg-rose-500' },
                { label: 'Medium', key: 'medium', color: 'bg-amber-400' },
                { label: 'Low', key: 'low', color: 'bg-sky-500' },
              ].map(p => (
                <div key={p.key}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{p.label}</span>
                    <span className="font-mono">{tasksByPriority[p.key] || 0}</span>
                  </div>
                  <ProgressBar value={tasksByPriority[p.key] || 0} max={totalTasks} color={p.color} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My tasks */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">My Open Tasks</h2>
          {myTasks?.length === 0 ? (
            <EmptyState icon="✓" title="All caught up!" description="No tasks assigned to you" />
          ) : (
            <div className="flex flex-col gap-2">
              {myTasks?.map(task => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks`}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-ink-700 hover:bg-ink-600 transition-colors border border-ink-600 hover:border-ink-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm text-slate-200 font-medium line-clamp-1">{task.title}</span>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-slate-500">{task.project_name}</span>
                    {task.due_date && (
                      <span className={`text-xs ml-auto font-mono ${
                        isAfter(new Date(), parseISO(task.due_date)) ? 'text-rose-400' : 'text-slate-500'
                      }`}>
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Overdue Tasks</h2>
            {overdueTasks?.length > 0 && (
              <span className="badge bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {overdueTasks.length}
              </span>
            )}
          </div>
          {overdueTasks?.length === 0 ? (
            <EmptyState icon="🎉" title="No overdue tasks" description="Everything is on track!" />
          ) : (
            <div className="flex flex-col gap-2">
              {overdueTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks`}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
                >
                  <span className="text-sm text-slate-200 font-medium line-clamp-1">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{task.project_name}</span>
                    {task.assigned_to_name && (
                      <span className="text-xs text-slate-600">→ {task.assigned_to_name}</span>
                    )}
                    <span className="text-xs text-rose-400 ml-auto font-mono">
                      {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks per user */}
      {tasksByUser?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Tasks per Team Member</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-600">
                  <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">Member</th>
                  <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">Total</th>
                  <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">To Do</th>
                  <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">In Progress</th>
                  <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">Done</th>
                  <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 font-medium">Completion</th>
                </tr>
              </thead>
              <tbody>
                {tasksByUser.map(u => (
                  <tr key={u.id} className="border-b border-ink-700 hover:bg-ink-700/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-xs text-violet-300 font-semibold">
                          {u.name[0].toUpperCase()}
                        </div>
                        <span className="text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-right text-slate-300 font-mono py-3">{u.total_tasks}</td>
                    <td className="text-right text-sky-400 font-mono py-3">{u.todo_tasks}</td>
                    <td className="text-right text-amber-300 font-mono py-3">{u.in_progress_tasks}</td>
                    <td className="text-right text-emerald-400 font-mono py-3">{u.done_tasks}</td>
                    <td className="py-3 pl-4">
                      <ProgressBar value={parseInt(u.done_tasks)} max={parseInt(u.total_tasks)} color="bg-emerald-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
