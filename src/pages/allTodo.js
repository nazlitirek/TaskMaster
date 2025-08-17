import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, getDocs, orderBy, where, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./AllTodo.css";

export default function AllTodo() {
  const [todoLists, setTodoLists] = useState([]);
  const [filteredLists, setFilteredLists] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterBy, setFilterBy] = useState("all");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTodoLists = async () => {
      try {
        // Tüm listeleri çek
        const q = query(collection(db, "todolists"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTodoLists(lists);

        // Her list için task’leri çek
        const tasksObj = {};
        for (let list of lists) {
          const taskQuery = query(collection(db, "tasks"), where("todolistId", "==", list.id));
          const taskSnap = await getDocs(taskQuery);
          tasksObj[list.id] = taskSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        setTasks(tasksObj);
        setLoading(false);
      } catch (err) {
        console.error("Veri çekilemedi:", err);
        setError("Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
        setLoading(false);
      }
    };

    fetchTodoLists();
  }, []);

  // Arama ve filtreleme fonksiyonu
  useEffect(() => {
    let filtered = [...todoLists];

    // Arama
    if (searchTerm) {
      filtered = filtered.filter(list => 
        list.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtreleme
    if (filterBy !== "all") {
      filtered = filtered.filter(list => {
        const stats = getTaskStats(list.id);
        const quadrants = getQuadrantCounts(list.id);
        
        switch (filterBy) {
          case "urgent":
            return quadrants.do > 0;
          case "completed":
            return stats.completionRate === 100;
          case "active":
            return stats.activeTasks > 0;
          default:
            return true;
        }
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "progress":
          const aStats = getTaskStats(a.id);
          const bStats = getTaskStats(b.id);
          return bStats.completionRate - aStats.completionRate;
        case "taskCount":
          const aTasks = tasks[a.id] || [];
          const bTasks = tasks[b.id] || [];
          return bTasks.length - aTasks.length;
        default: // createdAt
          return new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0);
      }
    });

    setFilteredLists(filtered);
  }, [todoLists, searchTerm, sortBy, filterBy, tasks]);

  // Liste silme fonksiyonu
  const deleteList = async (listId, e) => {
    e.stopPropagation();
    
    if (window.confirm("Bu listeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        // Önce listedeki tüm task'leri sil
        const listTasks = tasks[listId] || [];
        for (let task of listTasks) {
          await deleteDoc(doc(db, "tasks", task.id));
        }
        
        // Sonra listeyi sil
        await deleteDoc(doc(db, "todolists", listId));
        
        // State'i güncelle
        setTodoLists(prev => prev.filter(list => list.id !== listId));
        setTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[listId];
          return newTasks;
        });
        
      } catch (err) {
        console.error("Liste silinirken hata:", err);
        setError("Liste silinirken bir hata oluştu.");
      }
    }
  };

  const getTaskStats = (listId) => {
    const listTasks = tasks[listId] || [];
    const totalTasks = listTasks.length;
    const completedTasks = listTasks.filter(t => t.isDone).length;
    const activeTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return { totalTasks, completedTasks, activeTasks, completionRate };
  };

  const getQuadrantCounts = (listId) => {
    const listTasks = tasks[listId] || [];
    const activeTasks = listTasks.filter(t => !t.isDone);
    
    const counts = { do: 0, schedule: 0, delegate: 0, delete: 0 };
    
    activeTasks.forEach(task => {
      const isImportant = task.importance >= 3;
      const isUrgent = task.urgency >= 3;
      
      if (isImportant && isUrgent) counts.do++;
      else if (isImportant && !isUrgent) counts.schedule++;
      else if (!isImportant && isUrgent) counts.delegate++;
      else counts.delete++;
    });
    
    return counts;
  };

  if (loading) {
    return (
      <div className="alltodo-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Listeleriniz yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alltodo-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Bir Hata Oluştu</h3>
          <p className="error-description">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-btn"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (todoLists.length === 0) {
    return (
      <div className="alltodo-container">
        <div className="header-section">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            <span className="back-icon">←</span>
            Back to Dashboard
          </button>
          <div className="header-content">
            <h1 className="page-title">All Lists</h1>
            <p className="page-subtitle">Your task management hub</p>
          </div>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3 className="empty-title">No lists created yet</h3>
          <p className="empty-description">Start organizing your tasks by creating your first to-do list</p>
          <button 
            onClick={() => navigate("/createTodo")} 
            className="create-first-btn"
          >
            <span className="plus-icon">+</span>
            Create Your First List
          </button>
        </div>
      </div>
    );
  }

  if (filteredLists.length === 0 && todoLists.length > 0) {
    return (
      <div className="alltodo-container">
        <div className="header-section">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            <span className="back-icon">←</span>
            Back to Dashboard
          </button>
          <div className="header-content">
            <h1 className="page-title">All Lists</h1>
            <p className="page-subtitle">Your task management hub</p>
          </div>
          <button 
            onClick={() => navigate("/createTodo")} 
            className="create-new-btn"
          >
            <span className="plus-icon">+</span>
            New List
          </button>
        </div>

        <div className="controls-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="clear-search-btn"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="filters-container">
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Lists</option>
              <option value="urgent">Urgent Tasks</option>
              <option value="active">Active Lists</option>
              <option value="completed">Completed Lists</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="createdAt">Created Date</option>
              <option value="title">Name (A-Z)</option>
              <option value="progress">Progress</option>
              <option value="taskCount">Task Count</option>
            </select>
          </div>
        </div>
        
        <div className="no-results-state">
          <div className="no-results-icon">🔍</div>
          <h3 className="no-results-title">No matching lists found</h3>
          <p className="no-results-description">
            Try adjusting your search terms or filters
          </p>
          <button 
            onClick={() => {
              setSearchTerm("");
              setFilterBy("all");
            }}
            className="clear-filters-btn"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alltodo-container">
      <div className="header-section">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <span className="back-icon">←</span>
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1 className="page-title">All Lists</h1>
          <p className="page-subtitle">Manage and track all your to-do lists</p>
        </div>
        <button 
          onClick={() => navigate("/createTodo")} 
          className="create-new-btn"
        >
          <span className="plus-icon">+</span>
          New List
        </button>
      </div>

      <div className="controls-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="clear-search-btn"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div className="filters-container">
          <select 
            value={filterBy} 
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Lists</option>
            <option value="urgent">Urgent Tasks</option>
            <option value="active">Active Lists</option>
            <option value="completed">Completed Lists</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="createdAt">Created Date</option>
            <option value="title">Name (A-Z)</option>
            <option value="progress">Progress</option>
            <option value="taskCount">Task Count</option>
          </select>
        </div>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{todoLists.length}</div>
          <div className="stat-label">Total Lists</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Object.values(tasks).reduce((sum, list) => sum + list.length, 0)}
          </div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {Object.values(tasks).reduce((sum, list) => sum + list.filter(t => t.isDone).length, 0)}
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {filteredLists.length}
          </div>
          <div className="stat-label">Showing</div>
        </div>
      </div>

      <div className="lists-grid">
        {filteredLists.map(list => {
          const stats = getTaskStats(list.id);
          const quadrants = getQuadrantCounts(list.id);
          const hasUrgentTasks = quadrants.do > 0;
          
          return (
            <div
              key={list.id}
              className={`list-card ${hasUrgentTasks ? 'urgent' : ''}`}
              onClick={() => navigate(`/todolist/${list.id}`)}
            >
              <div className="list-header">
                <h3 className="list-title">{list.title}</h3>
                <div className="list-actions">
                  <div className="list-date">
                    {list.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </div>
                  <button
                    onClick={(e) => deleteList(list.id, e)}
                    className="delete-list-btn"
                    title="Delete list"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="progress-section">
                <div className="progress-info">
                  <span className="progress-text">
                    {stats.completedTasks} of {stats.totalTasks} completed
                  </span>
                  <span className="progress-percentage">{stats.completionRate}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="quadrant-overview">
                <div className="quadrant-item do">
                  <span className="quadrant-icon">🔥</span>
                  <span className="quadrant-count">{quadrants.do}</span>
                </div>
                <div className="quadrant-item schedule">
                  <span className="quadrant-icon">📅</span>
                  <span className="quadrant-count">{quadrants.schedule}</span>
                </div>
                <div className="quadrant-item delegate">
                  <span className="quadrant-icon">👥</span>
                  <span className="quadrant-count">{quadrants.delegate}</span>
                </div>
                <div className="quadrant-item delete">
                  <span className="quadrant-icon">🗑️</span>
                  <span className="quadrant-count">{quadrants.delete}</span>
                </div>
              </div>

              <div className="list-footer">
                <div className="task-summary">
                  <span className="active-tasks">{stats.activeTasks} active</span>
                  {hasUrgentTasks && (
                    <span className="urgent-badge">
                      <span className="urgent-icon">⚠️</span>
                      Urgent tasks
                    </span>
                  )}
                </div>
                <div className="view-arrow">→</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
