import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../utils/useAuth";

interface Props {
  children: React.ReactNode;
}

/**
 * Guards a protected route. If no session exists, redirects to /login while
 * preserving the originally requested path in `state.from` so we can return
 * the user there after they sign in.
 *
 * While Supabase is hydrating its cached session on first mount we render
 * nothing — this avoids a flash-of-redirect on hard refresh when the user
 * actually is signed in.
 */
export default function AuthGuard({ children }: Props) {
  const location = useLocation();
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
