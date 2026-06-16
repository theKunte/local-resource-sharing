import { useParams } from "react-router-dom";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import RequestDashboard from "../components/RequestDashboard";

export default function Requests() {
  const { user, loading } = useFirebaseAuth();
  const { requestId } = useParams<{ requestId?: string }>();
  return (
    <div className="h-full bg-sage-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Borrow Requests
          </h1>
          <p className="text-slate-600 text-sm">
            Manage incoming requests and track your borrowed items
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : user?.uid ? (
          <RequestDashboard userId={user.uid} highlightId={requestId} />
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
