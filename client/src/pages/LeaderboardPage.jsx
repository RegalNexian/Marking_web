import { useState, useEffect, useCallback } from 'react';
import { marksAPI, exportAPI, tracksAPI } from '../utils/api';
import LeaderboardTable from '../components/LeaderboardTable';
import { GiTrophy } from 'react-icons/gi';
import { IoMdRefreshCircle } from 'react-icons/io';

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState({ leaderboard: [], juries: [], track: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');

  const fetchLeaderboard = useCallback(async (trackId, isAuto = false) => {
    if (!trackId) {
      setLeaderboardData({ leaderboard: [], juries: [], track: null });
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (!isAuto) {
        setLoading(true);
      }
      const response = await marksAPI.getLeaderboard(trackId ? { trackId } : {});
      setLeaderboardData(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const trackResponse = await tracksAPI.getAll();
      setTracks(trackResponse.data);
      const defaultTrack = trackResponse.data.find(track => track.isActive) || trackResponse.data[0];
      const defaultId = defaultTrack?._id || '';
      setSelectedTrackId(defaultId);
      if (defaultId) {
        await fetchLeaderboard(defaultId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard. Please try again.');
      setLoading(false);
    }
  }, [fetchLeaderboard]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedTrackId) return undefined;
    const interval = setInterval(() => fetchLeaderboard(selectedTrackId, true), 30000);
    return () => clearInterval(interval);
  }, [selectedTrackId, fetchLeaderboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard(selectedTrackId);
  };

  const handleExportExcel = () => {
    exportAPI.leaderboardExcel(selectedTrackId);
  };

  const handleTrackChange = async (value) => {
    setSelectedTrackId(value);
    await fetchLeaderboard(value);
  };

  if (loading && !refreshing) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  if (error && !refreshing) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => fetchLeaderboard(selectedTrackId)}
          className="mt-2 text-red-600 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GiTrophy className="text-4xl text-yellow-500" />
                <h1 className="text-3xl font-bold text-gray-800">Competition Leaderboard</h1>
              </div>
              <p className="text-gray-600">
                Real-time rankings filtered by track assignment
              </p>
              {leaderboardData.track && (
                <p className="text-sm text-gray-500 mt-1">
                  Currently viewing: <span className="font-medium text-gray-700">{leaderboardData.track.name}</span>
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <select
                value={selectedTrackId}
                onChange={(e) => handleTrackChange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tracks.length === 0 && <option value="">All Tracks</option>}
                {tracks.map(track => (
                  <option key={track._id} value={track._id}>{track.name}</option>
                ))}
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {refreshing ? (
                  <span className="flex items-center">
                    <IoMdRefreshCircle className="animate-spin mr-2" />
                    Refreshing...
                  </span>
                ) : (
                  '🔄 Refresh'
                )}
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 ease-in-out"
                disabled={leaderboardData.leaderboard.length === 0}
              >
                📥 Download Excel
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {leaderboardData.leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-gray-600 mb-4">No Results Yet</h2>
              <p className="text-gray-500 mb-6">
                Leaderboard will appear once juries start submitting their marks for this track.
              </p>
            </div>
          ) : (
            <>
              {leaderboardData.leaderboard.length >= 3 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">🥇 Top Performers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {leaderboardData.leaderboard.slice(0, 3).map((team, index) => (
                      <div
                        key={team.teamName}
                        className={`text-center p-6 rounded-lg border-2 ${index === 0
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : index === 1
                              ? 'bg-gray-100 text-gray-800 border-gray-200'
                              : 'bg-orange-100 text-orange-800 border-orange-200'
                          }`}
                      >
                        <div className="text-4xl mb-2">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                        <h3 className="text-xl font-bold mb-2">{team.teamName}</h3>
                        <p className="text-2xl font-bold">{team.grandTotal} pts</p>
                        <p className="text-sm opacity-75">Rank #{team.rank}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <LeaderboardTable
                leaderboard={leaderboardData.leaderboard}
                juries={leaderboardData.juries}
              />
            </>
          )}
        </div>

        {leaderboardData.leaderboard.length > 0 && (
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <div className="text-2xl font-bold text-blue-600">{leaderboardData.leaderboard.length}</div>
                <div className="text-sm text-gray-600">Total Teams</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-green-600">{leaderboardData.juries.length}</div>
                <div className="text-sm text-gray-600">Juries</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...leaderboardData.leaderboard.map(t => t.grandTotal))}
                </div>
                <div className="text-sm text-gray-600">Highest Score</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    leaderboardData.leaderboard.reduce((sum, t) => sum + t.grandTotal, 0) /
                    leaderboardData.leaderboard.length
                  )}
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;