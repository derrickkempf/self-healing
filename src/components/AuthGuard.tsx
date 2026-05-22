import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

interface Props {
  children: React.ReactNode;
}

/**
 * Guards a protected route. If no session exists, redirects to /login while
 * preserving the originally requested path in `state.from` so we can return
 * the user there after they sign in.
 */
export default function AuthGuard({ children }: Props) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
