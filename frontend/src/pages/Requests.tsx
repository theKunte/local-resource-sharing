import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import RequestDashboard from "../components/RequestDashboard";

export default function Requests() {
  const { user } = useFirebaseAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Borrow Requests
          </h1>
          <p className="text-gray-600">
            Manage incoming requests and track your pending requests
          </p>
        </div>
        {user?.uid ? (
          <RequestDashboard userId={user.uid} />
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-600">
              Sign in to view and manage your borrow requests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
