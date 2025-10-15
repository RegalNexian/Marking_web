import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { juriesAPI, tracksAPI } from "../utils/api";
import JuryCard from "../components/JuryCard";
import toast from "react-hot-toast";

const MASTER_KEY = "CDD123"; // Master key for all juries

const summarizeAssignments = (juries) => {
  let submitted = 0;
  let paused = 0;
  let pending = 0;

  juries.forEach((jury) => {
    (jury.assignments || []).forEach((assignment) => {
      if (assignment.hasSubmitted) submitted += 1;
      else if (assignment.paused) paused += 1;
      else pending += 1;
    });
  });

  return {
    submitted,
    paused,
    pending,
    total: submitted + paused + pending,
  };
};

const Home = () => {
  const navigate = useNavigate();
  const [juries, setJuries] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [juriesLoading, setJuriesLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJury, setSelectedJury] = useState(null);
  const [selectedTrackFilter, setSelectedTrackFilter] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadTracks();
  }, []);

  useEffect(() => {
    if (!selectedTrackFilter) {
      setJuries([]);
      return;
    }

    loadJuries(selectedTrackFilter);
  }, [selectedTrackFilter]);

  const loadTracks = async () => {
    try {
      setTracksLoading(true);
      const trackResponse = await tracksAPI.getAll();
      setTracks(trackResponse.data);
      setError("");
    } catch (err) {
      console.error("Failed to load tracks:", err);
      setError("Failed to load tracks. Please try again.");
    } finally {
      setTracksLoading(false);
    }
  };

  const loadJuries = async (trackId) => {
    try {
      setJuriesLoading(true);
      const juryResponse = await juriesAPI.getAll({ trackId });
      setJuries(juryResponse.data);
      setError("");
    } catch (err) {
      console.error("Failed to load juries:", err);
      setError("Failed to load juries. Please try again.");
    } finally {
      setJuriesLoading(false);
    }
  };

  const resetSelectionState = () => {
    setSelectedJury(null);
    setSelectedTrackId("");
    setPasswordInput("");
    setPasswordError("");
    setShowPassword(false);
  };

  const handleJurySelect = (jury) => {
    if (!jury.assignments || jury.assignments.length === 0) {
      toast.error("This jury is not assigned to any track yet.");
      return;
    }

    const defaultTrack =
      (selectedTrackFilter &&
        jury.assignments.find(
          (assignment) => assignment.track && assignment.track._id === selectedTrackFilter
        )?.track?._id) ||
      jury.defaultTrack?._id ||
      jury.assignments[0]?.track?._id ||
      "";
    setSelectedJury(jury);
    setSelectedTrackId(defaultTrack);
    setPasswordInput("");
    setPasswordError("");
    setShowPassword(false);
  };

  const handlePasswordSubmit = async () => {
    if (!selectedJury) return;

    if (!selectedTrackId) {
      setPasswordError("Please choose a track assignment.");
      return;
    }

    const assignment = selectedJury.assignments.find(
      (item) => item.track && item.track._id === selectedTrackId
    );

    if (!assignment) {
      setPasswordError("Selected track is no longer assigned to this jury.");
      return;
    }

    const rawEntry = passwordInput.trim();
    if (!rawEntry) {
      setPasswordError("Please enter the track password.");
      return;
    }

    const entered = rawEntry.toUpperCase();
    const juryNameUpper = selectedJury.name.trim().toUpperCase();

    try {
      setPasswordError("");
      await tracksAPI.verifyPassword(selectedTrackId, rawEntry);
      navigate(`/jury/${encodeURIComponent(selectedJury.name)}/track/${selectedTrackId}`);
    } catch (err) {
      if (entered === juryNameUpper || entered === MASTER_KEY) {
        navigate(`/jury/${encodeURIComponent(selectedJury.name)}/track/${selectedTrackId}`);
        return;
      }

      const message = err.response?.data?.message || "Incorrect password. Please try again.";
      setPasswordError(message);
    }
  };

  const handleCloseModal = () => {
    resetSelectionState();
  };

  const handleTrackChange = (event) => {
    const value = event.target.value;
    if (value !== selectedTrackFilter) {
      resetSelectionState();
      setSelectedTrackFilter(value);
    }
  };

  const handleRetry = () => {
    if (!tracks.length) {
      loadTracks();
    }
    if (selectedTrackFilter) {
      loadJuries(selectedTrackFilter);
    }
  };

  const assignmentStats = useMemo(() => summarizeAssignments(juries), [juries]);

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to the Marking System
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Please choose your event track before selecting your jury panel
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 max-w-2xl mx-auto">
          <p className="text-blue-800 text-sm">
            <strong>Instructions:</strong> Select the track/event from the menu below, pick your jury, and enter your password (or master key) to access the marking interface.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto mb-10">
        <label htmlFor="track-select" className="block text-sm font-medium text-gray-700 mb-2">
          Track / Event
        </label>
        <select
          id="track-select"
          value={selectedTrackFilter}
          onChange={handleTrackChange}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={tracksLoading}
        >
          <option value="" disabled>
            {tracksLoading ? "Loading tracks..." : "Select a track"}
          </option>
          {tracks.map((track) => (
            <option key={track._id} value={track._id}>
              {track.eventName || track.name}
              {track.eventName && track.name !== track.eventName ? ` • ${track.name}` : ""}
            </option>
          ))}
        </select>
        {!tracksLoading && tracks.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No tracks available yet. Please contact the administrator.
          </p>
        )}
      </div>

      {(tracksLoading || juriesLoading) && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">
            {tracksLoading ? "Loading tracks..." : "Loading juries..."}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {!tracksLoading && !juriesLoading && !error && (
        <>
          {!selectedTrackFilter ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-600 mb-3">Select a track to continue</h2>
              <p className="text-gray-500">
                Choose your assigned event track from the dropdown above to view available juries.
              </p>
            </div>
          ) : juries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍⚖️</div>
              <h2 className="text-2xl font-bold text-gray-600 mb-3">No Juries Available</h2>
              <p className="text-gray-500">
                There are no juries assigned to this track yet. Please contact the administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {juries.map((jury) => (
                <JuryCard
                  key={jury._id}
                  jury={jury}
                  onSelect={() => handleJurySelect(jury)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedTrackFilter && juries.length > 0 && (
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Quick Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{juries.length}</div>
              <div className="text-sm text-gray-600">Total Juries</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{tracks.length}</div>
              <div className="text-sm text-gray-600">Active Tracks</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{assignmentStats.submitted}</div>
              <div className="text-sm text-gray-600">Assignments Submitted</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{assignmentStats.pending}</div>
              <div className="text-sm text-gray-600">Assignments Pending</div>
            </div>
          </div>
        </div>
      )}

      {selectedJury && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 sm:w-96 text-center relative">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🔒 Access {selectedJury.name}
            </h2>

            <p className="text-gray-500 text-sm mb-3">
              Select your track and confirm your identity to continue.
            </p>

            <div className="space-y-2 mb-5 text-left max-h-48 overflow-y-auto pr-1">
              {(selectedJury.assignments || []).map((assignment) => {
                const trackId = assignment.track?._id;
                const isSelected = selectedTrackId === trackId;
                const statusLabel = assignment.hasSubmitted
                  ? "Submitted"
                  : assignment.paused
                    ? "Paused"
                    : "Pending";
                const statusColor = assignment.hasSubmitted
                  ? "text-green-600"
                  : assignment.paused
                    ? "text-orange-600"
                    : "text-blue-600";

                return (
                  <button
                    key={trackId}
                    type="button"
                    onClick={() => setSelectedTrackId(trackId)}
                    className={`w-full border rounded-lg px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {assignment.track?.name || "Track"}
                        </div>
                        {assignment.track?.eventName && (
                          <div className="text-xs text-gray-500 mt-1">
                            {assignment.track.eventName}
                          </div>
                        )}
                      </div>
                      <span className={`text-sm font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePasswordSubmit();
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>

            {passwordError && (
              <p className="text-red-500 text-sm mt-2">{passwordError}</p>
            )}

            <div className="flex justify-center gap-4 mt-5">
              <button
                onClick={handlePasswordSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg shadow-md transition-transform transform hover:scale-105 active:scale-95"
              >
                Unlock
              </button>
              <button
                onClick={handleCloseModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-5 py-2 rounded-lg transition-transform transform hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
