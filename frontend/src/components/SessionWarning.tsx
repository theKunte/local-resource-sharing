import React from "react";

interface SessionWarningProps {
  onExtend: () => void;
  onSignOut: () => void;
}

const SessionWarning: React.FC<SessionWarningProps> = ({
  onExtend,
  onSignOut,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Session Expiring Soon
        </h2>
        <p className="text-gray-600 mb-6">
          Your session will expire in 5 minutes due to inactivity. Would you
          like to extend your session?
        </p>
        <div className="flex space-x-4">
          <button
            onClick={onExtend}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Extend Session
          </button>
          <button
            onClick={onSignOut}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarning;
