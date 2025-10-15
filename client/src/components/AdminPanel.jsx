import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { juriesAPI, teamsAPI, configAPI, getCriteria, tracksAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AdminPanel = ({ activeTab, juries, teams, tracks, config, onDataUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [criteriaList, setCriteriaList] = useState([]);

  useEffect(() => {
    if (activeTab === 'config') {
      getCriteria().then((res) => setCriteriaList(res.data));
    }
  }, [activeTab]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);

    if (type === 'jury') {
      if (item) {
        setFormData({
          name: item.name,
          trackIds: (item.assignments || []).map((assignment) => assignment.track?._id).filter(Boolean),
          defaultTrackId: item.defaultTrack?._id || ''
        });
      } else {
        setFormData({ name: '', trackIds: [], defaultTrackId: '' });
      }
    } else if (type === 'team') {
      if (item) {
        setFormData({
          name: item.name,
          category: item.category,
          trackId: item.track?._id || ''
        });
      } else {
        setFormData({ name: '', category: '', trackId: tracks[0]?._id || '' });
      }
    } else if (type === 'track') {
      if (item) {
        setFormData({
          name: item.name,
          eventName: item.eventName || '',
          description: item.description || '',
          accessPassword: '',
          isActive: Boolean(item.isActive)
        });
      } else {
        setFormData({ name: '', eventName: '', description: '', accessPassword: '', isActive: true });
      }
    } else if (type === 'config') {
      setFormData(item || {});
    } else {
      setFormData(item || {});
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType('');
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (activeTab === 'juries') {
        if (!formData.name) {
          toast.error('Jury name is required');
          return;
        }

        if (editingItem) {
          await juriesAPI.updateAssignments(editingItem._id, {
            trackIds: formData.trackIds,
            defaultTrackId: formData.defaultTrackId
          });
        } else {
          await juriesAPI.create({
            name: formData.name,
            trackIds: formData.trackIds,
            defaultTrackId: formData.defaultTrackId
          });
        }
      } else if (activeTab === 'teams') {
        if (!formData.trackId) {
          toast.error('Please select a track');
          return;
        }

        const payload = {
          name: formData.name,
          category: formData.category,
          trackId: formData.trackId
        };

        if (editingItem) {
          await teamsAPI.update(editingItem._id, payload);
        } else {
          await teamsAPI.create(payload);
        }
      } else if (activeTab === 'tracks') {
        if (!formData.name) {
          toast.error('Track name is required');
          return;
        }

        const trimmedPassword = (formData.accessPassword || '').trim();

        if (!editingItem && !trimmedPassword) {
          toast.error('Please set a password for the new track');
          return;
        }

        const payload = {
          name: formData.name,
          eventName: formData.eventName,
          description: formData.description,
          isActive: Boolean(formData.isActive)
        };

        if (editingItem) {
          if (trimmedPassword) {
            payload.accessPassword = trimmedPassword;
          } else if (formData.accessPassword === '') {
            payload.accessPassword = '';
          }
          await tracksAPI.update(editingItem._id, payload);
        } else {
          payload.accessPassword = trimmedPassword;
          await tracksAPI.create(payload);
        }
      } else if (activeTab === 'config') {
        const payload = { ...formData };
        if (payload.maxMarksPerCriterion === '') {
          delete payload.maxMarksPerCriterion;
        }
        await configAPI.update(payload);
      }

      closeModal();
      onDataUpdate();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      if (type === 'jury') {
        await juriesAPI.delete(name);
      } else if (type === 'team') {
        await teamsAPI.delete(id);
      } else if (type === 'track') {
        await tracksAPI.delete(id);
      }
      onDataUpdate();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  const renderJuriesTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Juries</h2>
        <button onClick={() => openModal('jury')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out">
          ➕ Add Jury
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {juries.map((jury) => (
          <div key={jury._id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">{jury.name}</h3>
              <div className="text-xs text-gray-500">{jury.assignments?.length || 0} track(s)</div>
            </div>
            <div className="space-y-2 mb-3 text-sm text-gray-600">
              {(jury.assignments || []).map((assignment) => {
                const status = assignment.hasSubmitted ? 'Submitted' : assignment.paused ? 'Paused' : 'Pending';
                return (
                  <div key={`${jury._id}-${assignment.track?._id}`} className="border border-gray-200 rounded px-2 py-1 flex items-center justify-between">
                    <span className="font-medium truncate pr-4">{assignment.track?.name || 'Track'}</span>
                    <span className={
                      assignment.hasSubmitted
                        ? 'text-green-600'
                        : assignment.paused
                          ? 'text-orange-600'
                          : 'text-blue-600'
                    }>
                      {status}
                    </span>
                  </div>
                );
              })}
              {(jury.assignments || []).length === 0 && <p>No track assignments yet.</p>}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => openModal('jury', jury)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out text-sm"
              >
                ✏️ Edit Assignments
              </button>
              <button
                onClick={() => handleDelete('jury', jury._id, jury.name)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out text-sm"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTeamsTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Teams</h2>
        <button
          onClick={() => openModal('team')}
          disabled={tracks.length === 0}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out ${tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          ➕ Add Team
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team, index) => (
              <tr key={team._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{team.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{team.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{team.track?.name || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => openModal('team', team)} className="text-blue-600 hover:text-blue-800">✏️ Edit</button>
                    <button onClick={() => handleDelete('team', team._id, team.name)} className="text-red-600 hover:text-red-800">🗑️ Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tracks.length === 0 && (
        <p className="mt-3 text-sm text-red-600">Create a track before adding teams.</p>
      )}
    </div>
  );

  const renderTracksTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Tracks</h2>
        <button onClick={() => openModal('track')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out">
          ➕ Add Track
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tracks.map((track, index) => (
              <tr key={track._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{track.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{track.eventName || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${track.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {track.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{track.description || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => openModal('track', track)} className="text-blue-600 hover:text-blue-800">✏️ Edit</button>
                    <button onClick={() => handleDelete('track', track._id, track.name)} className="text-red-600 hover:text-red-800">🗑️ Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">System Configuration</h2>
        <button onClick={() => openModal('config', config)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out">
          ✏️ Edit Config
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Competition Details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Competition Name</label>
              <p className="text-gray-900">{config?.competitionName || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">College Name</label>
              <p className="text-gray-900">{config?.collegeName || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Club Name</label>
              <p className="text-gray-900">{config?.clubName || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Marking Criteria</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Criteria List</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {criteriaList.length === 0 ? (
                  <span className="text-gray-400">No criteria set.</span>
                ) : (
                  criteriaList.map((criterion, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{criterion}</span>
                  ))
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Marks per Criterion</label>
              <p className="text-2xl font-bold text-blue-600">{config?.maxMarksPerCriterion || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-medium mb-4">{editingItem ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modalType === 'jury' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jury Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={Boolean(editingItem)}
                  />
                  {editingItem && <p className="text-xs text-gray-500 mt-1">Jury names cannot be changed.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Tracks</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                    {tracks.length === 0 && <p className="text-sm text-gray-500">Create a track first.</p>}
                    {tracks.map((track) => {
                      const checked = formData.trackIds?.includes(track._id);
                      return (
                        <label key={track._id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(formData.trackIds || []);
                              if (e.target.checked) {
                                next.add(track._id);
                              } else {
                                next.delete(track._id);
                              }
                              const updated = Array.from(next);
                              const defaultTrackId = updated.includes(formData.defaultTrackId)
                                ? formData.defaultTrackId
                                : (updated[0] || '');
                              setFormData({ ...formData, trackIds: updated, defaultTrackId });
                            }}
                          />
                          <span>{track.name}</span>
                          {!track.isActive && <span className="text-xs text-gray-400">(inactive)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Track</label>
                  <select
                    value={formData.defaultTrackId || ''}
                    onChange={(e) => setFormData({ ...formData, defaultTrackId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!formData.trackIds || formData.trackIds.length === 0}
                  >
                    <option value="" disabled>
                      {formData.trackIds && formData.trackIds.length > 0 ? 'Select default track' : 'Assign a track first'}
                    </option>
                    {(formData.trackIds || []).map((trackId) => {
                      const track = tracks.find((t) => t._id === trackId);
                      return (
                        <option key={trackId} value={trackId}>
                          {track?.name || 'Track'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            )}

            {modalType === 'team' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Track</label>
                  <select
                    value={formData.trackId || ''}
                    onChange={(e) => setFormData({ ...formData, trackId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Select track</option>
                    {tracks.map((track) => (
                      <option key={track._id} value={track._id}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {modalType === 'track' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Track Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={formData.eventName || ''}
                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingItem ? 'Set New Track Password (optional)' : 'Track Password'}
                  </label>
                  <input
                    type="password"
                    value={formData.accessPassword || ''}
                    onChange={(e) => setFormData({ ...formData, accessPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingItem ? 'Leave blank to keep existing password' : 'Enter track password'}
                    required={!editingItem}
                  />
                </div>
                <label className="inline-flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isActive)}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Mark as active for selection</span>
                </label>
              </>
            )}

            {modalType === 'config' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Competition Name</label>
                  <input
                    type="text"
                    value={formData.competitionName || ''}
                    onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
                  <input
                    type="text"
                    value={formData.collegeName || ''}
                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                  <input
                    type="text"
                    value={formData.clubName || ''}
                    onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks per Criterion</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxMarksPerCriterion ?? ''}
                    onChange={(e) => setFormData({ ...formData, maxMarksPerCriterion: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={closeModal} className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out">
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div>
      {activeTab === 'juries' && renderJuriesTab()}
      {activeTab === 'teams' && renderTeamsTab()}
      {activeTab === 'tracks' && renderTracksTab()}
      {activeTab === 'config' && renderConfigTab()}
      {renderModal()}
    </div>
  );
};

AdminPanel.propTypes = {
  activeTab: PropTypes.string.isRequired,
  juries: PropTypes.array.isRequired,
  teams: PropTypes.array.isRequired,
  tracks: PropTypes.array.isRequired,
  config: PropTypes.object.isRequired,
  onDataUpdate: PropTypes.func.isRequired,
};

export default AdminPanel;