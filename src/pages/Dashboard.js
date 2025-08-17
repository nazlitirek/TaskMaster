import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import "./Dashboard.css";

export default function Dashboard() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [todoLists, setTodoLists] = useState([]);
  const [tasks, setTasks] = useState({}); // { [todolistId]: [task1, task2, ...] }

  useEffect(() => {
    if (!currentUser) return;

    const fetchTodoLists = async () => {
  if (!currentUser) return;

  try {
    // Todo listeleri çek
    const q = query(collection(db, "todolists"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn("Todo listesi bulunamadı.");
      setTodoLists([]);
      setTasks({});
      return;
    }

    const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setTodoLists(lists);

    // Her liste için task’leri çek
    const tasksObj = {};

    for (let list of lists) {
      try {
        const taskQuery = query(
          collection(db, "tasks"),
          where("todolistId", "==", list.id)
        );
        const taskSnap = await getDocs(taskQuery);

        if (taskSnap.empty) {
          console.info(`Liste "${list.title}" için task bulunamadı.`);
          tasksObj[list.id] = [];
        } else {
          tasksObj[list.id] = taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (taskErr) {
        console.error(`Liste "${list.title}" task çekilirken hata:`, taskErr);
        tasksObj[list.id] = [];
      }
    }

    setTasks(tasksObj);
  } catch (err) {
    console.error("Todo listeleri çekilirken genel hata:", err);
    setTodoLists([]);
    setTasks({});
  }
};


    fetchTodoLists();
  }, [currentUser]);

  if (!currentUser) return (
    <div className="dashboard-container">
      <div className="auth-message">
        <h2>🔐 Please log in to access your dashboard</h2>
      </div>
    </div>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getTaskCount = (listId) => {
    return tasks[listId] ? tasks[listId].length : 0;
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <h1 className="brand-title">TaskMaster</h1>
          <span className="brand-subtitle">Dashboard</span>
        </div>
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            <span className="user-email">{currentUser.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome back! 👋</h1>
          <p className="welcome-subtitle">Ready to manage your tasks efficiently?</p>
        </div>

        <div className="dashboard-grid">
          {/* Create New List Card */}
          <div className="dashboard-card create-card" onClick={() => navigate("/createTodo")}>
            <div className="card-icon">➕</div>
            <h3 className="card-title">Create New List</h3>
            <p className="card-description">Start organizing your tasks with a new to-do list</p>
            <div className="card-action">
              <span className="action-text">Get Started</span>
              <span className="action-arrow">→</span>
            </div>
          </div>

          {/* All Lists Card */}
          <div className="dashboard-card view-all-card" onClick={() => navigate("/allTodo")}>
            <div className="card-icon">📋</div>
            <h3 className="card-title">All Lists</h3>
            <p className="card-description">View and manage all your to-do lists</p>
            <div className="card-stats">
              <span className="stats-number">{todoLists.length}</span>
              <span className="stats-label">Total Lists</span>
            </div>
            <div className="card-action">
              <span className="action-text">View All</span>
              <span className="action-arrow">→</span>
            </div>
          </div>

          {/* Recent Lists Card */}
          <div className="dashboard-card recent-card">
            <div className="card-header">
              <div className="card-icon">🕒</div>
              <h3 className="card-title">Recent Lists</h3>
            </div>
            <div className="recent-lists">
              {todoLists.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p className="empty-text">No lists yet. Create your first one!</p>
                </div>
              ) : (
                todoLists.slice(0, 3).map(list => (
                  <div
                    key={list.id}
                    className="recent-list-item"
                    onClick={() => navigate(`/todolist/${list.id}`)}
                  >
                    <div className="list-info">
                      <span className="list-title">{list.title}</span>
                      <span className="list-tasks">{getTaskCount(list.id)} tasks</span>
                    </div>
                    <span className="list-arrow">→</span>
                  </div>
                ))
              )}
            </div>
            {todoLists.length > 3 && (
              <div className="view-more" onClick={() => navigate("/allTodo")}>
                <span>View all lists</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
