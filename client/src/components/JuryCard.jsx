import PropTypes from 'prop-types';

const JuryCard = ({ jury, onSelect }) => {
  const assignments = jury.assignments || [];
  const submittedCount = assignments.filter((a) => a.hasSubmitted).length;
  const pausedCount = assignments.filter((a) => a.paused && !a.hasSubmitted).length;
  const pendingCount = assignments.length - submittedCount - pausedCount;

  const getBadge = () => {
    if (assignments.length === 0) {
      return {
        label: 'Unassigned',
        icon: '⚪',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        border: 'border-gray-200 hover:border-gray-300 hover:shadow-gray-100'
      };
    }

    if (submittedCount === assignments.length) {
      return {
        label: 'All Submitted',
        icon: '✅',
        color: 'text-green-600 bg-green-50 border-green-200',
        border: 'border-green-200 hover:border-green-400 hover:shadow-green-100'
      };
    }

    if (pausedCount > 0) {
      return {
        label: 'Paused',
        icon: '⏸️',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        border: 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100'
      };
    }

    return {
      label: 'In Progress',
      icon: '📝',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      border: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100'
    };
  };

  const badge = getBadge();

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${badge.border}`}
      onClick={onSelect}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-3xl">👨‍⚖️</div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
            {badge.icon} {badge.label}
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-2">{jury.name}</h3>

        <div className="text-sm text-gray-600 mb-4">
          {assignments.length > 0 ? `${assignments.length} track${assignments.length > 1 ? 's' : ''} assigned` : 'No track assignments'}
        </div>

        {assignments.slice(0, 3).map((assignment, idx) => {
          const status = assignment.hasSubmitted
            ? { label: 'Submitted', color: 'text-green-600' }
            : assignment.paused
              ? { label: 'Paused', color: 'text-orange-600' }
              : { label: 'Pending', color: 'text-blue-600' };

          return (
            <div
              key={assignment.track?._id || `assignment-${idx}`}
              className="flex items-center justify-between text-sm text-gray-700 mb-2"
            >
              <span className="font-medium truncate pr-4">
                {assignment.track?.name || 'Track'}
              </span>
              <span className={status.color}>{status.label}</span>
            </div>
          );
        })}

        {assignments.length > 3 && (
          <div className="text-xs text-gray-500">+{assignments.length - 3} more tracks</div>
        )}

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>
            {submittedCount} submitted · {pendingCount} pending
          </div>
          <div className="text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

JuryCard.propTypes = {
  jury: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    assignments: PropTypes.arrayOf(
      PropTypes.shape({
        hasSubmitted: PropTypes.bool,
        paused: PropTypes.bool,
        track: PropTypes.shape({
          _id: PropTypes.string,
          name: PropTypes.string,
          eventName: PropTypes.string,
        }),
      })
    ),
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default JuryCard;