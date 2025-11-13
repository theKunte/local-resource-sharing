import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

export default function Requests() {
  const { user } = useFirebaseAuth();
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Gear Requests</h1>
      {user ? (
        <p className="text-slate-600">
          This feature is coming soon. You'll be able to send and manage borrow
          requests here.
        </p>
      ) : (
        <p className="text-slate-600">
          Sign in to view and create gear borrow requests.
        </p>
      )}
    </div>
  );
}
