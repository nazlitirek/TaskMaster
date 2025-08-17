import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useContext(AuthContext);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}
