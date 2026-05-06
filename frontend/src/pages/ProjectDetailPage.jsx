import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectsAPI, authAPI } from '../api';
import { Modal, RoleBadge, EmptyState, Spinner, ErrorMsg, ConfirmModal, Avatar } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const AddMemberModal = ({ isOpen, onClose, projectId, onAdd }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearch(val);
    if (val.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await authAPI.searchUsers(val);
      setResults(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (user, role = 'member') => {
    setAdding(user.id);
    setError(null);
    try {
      await projectsAPI.addMember(projectId, { userId: user.id, role });
      onAdd({ ...user, role });
      setSearch('');
      setResults([]);
    } catch (err) {
      setError(err);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member">
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">Search by Email</label>
          <input
            className="input"
            placeholder="john@example.com"
            value={search}
            onChange={handleSearch}
          />
          <p className="text-xs text-slate-600 mt-1">Type at least 3 characters</p>
        </div>

        {loading && <div className="flex justify-center"><Spinner size="sm" /></div>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-ink-700 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={user.name} />
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(user)}
                  disabled={adding === user.id}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {adding === user.id ? <Spinner size="sm" /> : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {search.length >= 3 && results.length === 0 && !loading && (
          <p className="text-sm text-slate-500 text-center py-2">No users found</p>
        )}

        <ErrorMsg error={error} />
      </div>
    </Modal>
  );
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    projectsAPI.getById(id)
      .then(res => {
        setProject(res.data);
        setEditForm({ name: res.data.name, description: res.data.description || '' });
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = project?.user_role === 'admin';

  const handleAddMember = (member) => {
    setProject(prev => ({ ...prev, members: [...prev.members, member] }));
    setShowAddMember(false);
  };

  const handleRemoveMember = async (userId) => {
    try {
      await projectsAPI.removeMember(id, userId);
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.id !== userId) }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteProject = async () => {
    await projectsAPI.delete(id);
    navigate('/projects');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectsAPI.update(id, editForm);
      setProject(prev => ({ ...prev, ...editForm }));
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">
            ← Projects
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-semibold text-slate-100">{project?.name}</h1>
          <RoleBadge role={project?.user_role} />
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/projects/${id}/tasks`} className="btn-primary flex items-center gap-2">
            ◎ View Tasks
          </Link>
          {isAdmin && (
            <>
              <button onClick={() => setEditMode(!editMode)} className="btn-secondary">
                {editMode ? 'Cancel' : '✎ Edit'}
              </button>
              <button onClick={() => setConfirmDelete('project')} className="btn-danger">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Edit form */}
      {editMode && isAdmin && (
        <form onSubmit={handleSaveEdit} className="card p-5 flex flex-col gap-4 animate-slide-up">
          <h2 className="text-sm font-semibold text-slate-200">Edit Project</h2>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Spinner size="sm" />} Save
            </button>
            <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project info */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">About</h2>
          <p className="text-slate-400 text-sm">{project?.description || 'No description provided.'}</p>
          <div className="flex gap-6 mt-4 pt-4 border-t border-ink-600">
            <div>
              <p className="text-xs text-slate-600 mb-0.5">Created by</p>
              <p className="text-sm text-slate-300">{project?.creator_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-0.5">Members</p>
              <p className="text-sm text-slate-300">{project?.members?.length}</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Quick Actions</h2>
          <Link to={`/projects/${id}/tasks`} className="btn-secondary w-full text-center">
            ◎ Manage Tasks
          </Link>
          {isAdmin && (
            <button onClick={() => setShowAddMember(true)} className="btn-secondary w-full">
              + Add Member
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Members <span className="text-slate-600 font-normal ml-1">({project?.members?.length})</span>
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAddMember(true)} className="btn-primary text-xs px-3 py-1.5">
              + Add Member
            </button>
          )}
        </div>

        {project?.members?.length === 0 ? (
          <EmptyState icon="👥" title="No members" description="Add team members to this project" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {project?.members?.map(member => (
              <div key={member.id} className="flex items-center justify-between bg-ink-700 rounded-lg px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-200 font-medium">{member.name}</p>
                      {member.id === user?.id && (
                        <span className="text-xs text-violet-400">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={member.role} />
                  {isAdmin && member.id !== user?.id && (
                    <button
                      onClick={() => setConfirmDelete(member.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors text-sm ml-1"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        projectId={id}
        onAdd={handleAddMember}
      />

      <ConfirmModal
        isOpen={confirmDelete === 'project'}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message="This will permanently delete the project and all its tasks. This action cannot be undone."
      />

      {typeof confirmDelete === 'number' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => handleRemoveMember(confirmDelete)}
          title="Remove Member"
          message="Are you sure you want to remove this member from the project? Their task assignments will remain."
        />
      )}
    </div>
  );
}
