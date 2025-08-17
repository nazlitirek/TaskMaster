import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreateTodo from "./pages/createTodo";
import ProtectedRoute from "./pages/ProtectedRoute";
import TodolistPage from "./pages/TodolistPage";
function App() {
  return (
    <Router>
      <Routes>
        {/* Auth sayfası */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/createTodo" element={<CreateTodo />} />

        <Route path="/todolist/:id" element={<TodolistPage />} />

        {/* Dashboard sadece login ile erişilebilir */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
