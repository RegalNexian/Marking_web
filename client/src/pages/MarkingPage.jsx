import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsAPI, marksAPI, juriesAPI, getCriteria, tracksAPI } from '../utils/api';
import MarkingTable from '../components/MarkingTable';
import toast from 'react-hot-toast';

const MarkingPage = () => {
  const { juryName, trackId } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [marks, setMarks] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [track, setTrack] = useState(null);
  const [assignment, setAssignment] = useState(null);

  const storageKey = useMemo(() => {
    if (!juryName || !trackId) return null;
    return `marks_${juryName}_${trackId}`;
  }, [juryName, trackId]);

  useEffect(() => {
    if (juryName && trackId) {
      fetchData();
    }
  }, [juryName, trackId]);

  useEffect(() => {
    getCriteria().then(res => setCriteria(res.data));
  }, []);

  const fetchData = async () => {
    try {
      if (!trackId) {
        setError('Track missing. Please select your track from the home page.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const [teamsResponse, marksResponse, juryResponse, trackResponse] = await Promise.all([
        teamsAPI.getAll({ trackId }),
        marksAPI.getByJury(trackId, juryName),
        juriesAPI.getByName(juryName, { trackId }),
        tracksAPI.getById(trackId)
      ]);

      setTeams(teamsResponse.data);
      setTrack(trackResponse.data);

      const serverMarks = marksResponse.data?.marks || [];
      setMarks(serverMarks);

      const assignmentData = marksResponse.data?.assignment || juryResponse.data?.assignment || null;
      setAssignment(assignmentData);
      setIsPaused(Boolean(assignmentData?.paused));
      setHasSubmitted(Boolean(assignmentData?.hasSubmitted));

      if (serverMarks.length === 0 && storageKey) {
        const savedMarks = localStorage.getItem(storageKey);
        if (savedMarks) {
          setMarks(JSON.parse(savedMarks));
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (marksData, isSubmit = false) => {
    try {
      setSaving(true);
      await marksAPI.save(trackId, juryName, { marks: marksData });

      if (isSubmit) {
        setHasSubmitted(true);
        setIsPaused(false);
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        toast.success('Marks submitted successfully!');
        navigate('/');
      } else if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(marksData));
      }
    } catch (err) {
      console.error('Failed to save marks:', err);
      toast.error(err.response?.data?.message || 'Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    try {
      await juriesAPI.updateStatus(juryName, { trackId, paused: true });
      setIsPaused(true);
    } catch (err) {
      console.error('Failed to pause:', err);
      toast.error('Failed to pause. Please try again.');
    }
  };

  const handleResume = async () => {
    try {
      await juriesAPI.updateStatus(juryName, { trackId, paused: false });
      setIsPaused(false);
    } catch (err) {
      console.error('Failed to resume:', err);
      toast.error('Failed to resume. Please try again.');
    }
  };

  if (!trackId) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Track Selection Required</h1>
        <p className="text-gray-600 mb-6">
          The marking interface now requires a track context. Please return to the home page and choose your assigned track.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Go to Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading marking interface...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-red-600 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Marking Panel — Jury {juryName}
            </h1>
            <p className="text-gray-600 mb-1">
              Track: <span className="font-medium text-gray-800">{track?.name || '—'}</span>
            </p>
            {track?.eventName && (
              <p className="text-sm text-gray-500">Event: {track.eventName}</p>
            )}
            <p className="text-gray-600 mt-1">
              {hasSubmitted ? 'Marking completed and submitted' : 'Mark all teams based on the given criteria'}
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {hasSubmitted ? (
              <div className="flex items-center text-green-600">
                <span className="text-2xl mr-2">✅</span>
                <span className="font-medium">Submitted</span>
              </div>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out"
                  >
                    ▶️ Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out"
                  >
                    ⏸️ Pause
                  </button>
                )}
                <button
                  onClick={() => navigate('/')}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out"
                >
                  🏠 Home
                </button>
              </>
            )}
          </div>
        </div>

        {assignment && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-semibold">Status</p>
              <p className="text-lg font-bold text-blue-800">
                {hasSubmitted ? 'Submitted' : isPaused ? 'Paused' : 'In Progress'}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-semibold">Last Update</p>
              <p className="text-lg font-semibold text-gray-800">
                {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-semibold">Teams in Track</p>
              <p className="text-lg font-semibold text-purple-800">{teams.length}</p>
            </div>
          </div>
        )}

        {hasSubmitted && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <p className="text-green-800">
              <strong>Submitted:</strong> Your marks have been successfully submitted.
              You can still view the results but cannot make changes.
            </p>
          </div>
        )}

        {isPaused && !hasSubmitted && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <p className="text-orange-800">
              <strong>Paused:</strong> Marking is currently paused. Click Resume to continue.
            </p>
          </div>
        )}

        <MarkingTable
          teams={teams}
          initialMarks={marks}
          onSave={handleSave}
          disabled={isPaused || hasSubmitted}
          saving={saving}
          juryName={juryName}
          trackId={trackId}
          criteria={criteria}
          storageKey={storageKey}
        />
      </div>
    </div>
  );
};

export default MarkingPage;