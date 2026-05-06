import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../api';
import { Modal, RoleBadge, EmptyState, Spinner, ErrorMsg } from '../components/ui';

const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.create(form);
      onCreate(res.data);
      onClose();
      setForm({ name: '', description: '' });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label">Project Name</label>
          <input
            className="input"
            placeholder="My Awesome Project"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="What's this project about?"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <ErrorMsg error={error} />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    projectsAPI.getAll()
      .then(res => setProjects(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (project) => setProjects(prev => [project, ...prev]);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>+</span> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="◫"
            title="No projects yet"
            description="Create your first project to start collaborating with your team."
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create Project
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const progress = project.task_count > 0
              ? Math.round((project.done_count / project.task_count) * 100)
              : 0;
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="card-hover p-5 flex flex-col gap-4 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-100 text-base">{project.name}</h3>
                    {project.description && (
                      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <RoleBadge role={project.user_role} />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>👤 {project.member_count} member{project.member_count !== '1' ? 's' : ''}</span>
                  <span>◎ {project.task_count} task{project.task_count !== '1' ? 's' : ''}</span>
                </div>

                {project.task_count > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Progress</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-1 bg-ink-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-600">
                  By {project.creator_name}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
