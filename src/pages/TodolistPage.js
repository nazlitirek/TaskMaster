import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./TodolistPage.css";

export default function TodolistPage() {
  const { id } = useParams(); // todolistId
  const navigate = useNavigate();
  const [buckets, setBuckets] = useState({ do: [], schedule: [], delegate: [], delete: [], done: [] });
  const [listTitle, setListTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({
    taskName: "",
    importance: 1,
    urgency: 1,
    effort: 1
  });

  // Quadrant fonksiyonu artık burada
  const categorizeTasksStable = (tasks) => {
    const buckets = { do: [], schedule: [], delegate: [], delete: [], done: [] };

    const calcQuadrant = (importance, urgency) => {
      const isImportant = importance >= 3;
      const isUrgent = urgency >= 3;
      if (isImportant && isUrgent) return "do";
      if (isImportant && !isUrgent) return "schedule";
      if (!isImportant && isUrgent) return "delegate";
      return "delete";
    };

    const activeTasks = tasks.filter(t => !t.isDone);
    const doneTasks = tasks.filter(t => t.isDone);

    activeTasks.forEach(t => {
      const q = calcQuadrant(t.importance, t.urgency);
      buckets[q].push(t);
    });

    // effort küçükten büyüğe, tie-break: importance desc → urgency desc → createdAt asc
    const stableSort = arr =>
      arr.sort((a, b) => {
        if (a.effort !== b.effort) return a.effort - b.effort;
        if (a.importance !== b.importance) return b.importance - a.importance;
        if (a.urgency !== b.urgency) return b.urgency - a.urgency;
        const aTs = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        return aTs - bTs;
      });

    ["do","schedule","delegate","delete"].forEach(k => stableSort(buckets[k]));
    buckets.done = doneTasks;

    return buckets;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch todolist title
        const listDoc = await getDoc(doc(db, "todolists", id));
        if (listDoc.exists()) {
          setListTitle(listDoc.data().title);
        }

        // Fetch tasks
        const q = query(
          collection(db, "tasks"),
          where("todolistId", "==", id),
          orderBy("createdAt", "asc")
        );
        const snapshot = await getDocs(q);
        const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBuckets(categorizeTasksStable(allTasks));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const toggleDone = async (task) => {
  const taskRef = doc(db, "tasks", task.id);
  const newIsDone = !task.isDone;
  await updateDoc(taskRef, { isDone: newIsDone });

  setBuckets(prev => {
    const newBuckets = {
      do: prev.do.filter(t => t.id !== task.id),
      schedule: prev.schedule.filter(t => t.id !== task.id),
      delegate: prev.delegate.filter(t => t.id !== task.id),
      delete: prev.delete.filter(t => t.id !== task.id),
      done: prev.done.filter(t => t.id !== task.id),
    };

    if (newIsDone) {
      newBuckets.done.push({ ...task, isDone: true });
    } else {
      const q = task.quadrant || "do";
      newBuckets[q].push({ ...task, isDone: false });
    }

    return newBuckets;
  });
};

  const startEdit = (task) => {
    setEditingTask(task.id);
    setEditForm({
      taskName: task.taskName,
      importance: task.importance,
      urgency: task.urgency,
      effort: task.effort
    });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditForm({
      taskName: "",
      importance: 1,
      urgency: 1,
      effort: 1
    });
  };

  const saveEdit = async () => {
    if (!editForm.taskName.trim()) return;

    try {
      const taskRef = doc(db, "tasks", editingTask);
      await updateDoc(taskRef, {
        taskName: editForm.taskName,
        importance: parseInt(editForm.importance),
        urgency: parseInt(editForm.urgency),
        effort: parseInt(editForm.effort)
      });

      // Güncellenmiş task'ı alıp buckets'ı yeniden kategorize et
      const taskDoc = await getDoc(taskRef);
      if (taskDoc.exists()) {
        const updatedTask = { id: taskDoc.id, ...taskDoc.data() };
        
        setBuckets(prev => {
          // Eski task'ı tüm bucket'lardan kaldır
          const allTasks = [
            ...prev.do.filter(t => t.id !== editingTask),
            ...prev.schedule.filter(t => t.id !== editingTask),
            ...prev.delegate.filter(t => t.id !== editingTask),
            ...prev.delete.filter(t => t.id !== editingTask),
            ...prev.done.filter(t => t.id !== editingTask),
            updatedTask
          ];
          
          return categorizeTasksStable(allTasks);
        });
      }

      cancelEdit();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };


  const getBucketConfig = (bucketName) => {
    const configs = {
      do: {
        title: "Do First",
        subtitle: "Important & Urgent",
        emoji: "🔥",
        color: "red",
        description: "Critical tasks that need immediate attention"
      },
      schedule: {
        title: "Schedule",
        subtitle: "Important & Not Urgent", 
        emoji: "📅",
        color: "blue",
        description: "Important tasks to plan and schedule"
      },
      delegate: {
        title: "Delegate",
        subtitle: "Not Important & Urgent",
        emoji: "👥",
        color: "orange", 
        description: "Tasks that can be delegated to others"
      },
      delete: {
        title: "Delete",
        subtitle: "Not Important & Not Urgent",
        emoji: "🗑️",
        color: "gray",
        description: "Tasks to eliminate or minimize"
      },
      done: {
        title: "Completed",
        subtitle: "Finished tasks",
        emoji: "✅",
        color: "green",
        description: "Tasks that have been completed"
      }
    };
    return configs[bucketName] || {};
  };

  const getTaskCount = (bucket) => {
    return buckets[bucket]?.length || 0;
  };

  const getTotalActiveTasks = () => {
    return getTaskCount('do') + getTaskCount('schedule') + getTaskCount('delegate') + getTaskCount('delete');
  };

  if (loading) {
    return (
      <div className="todolist-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="todolist-container">
      <div className="todolist-header">
        <div className="header-content">
          <button onClick={() => navigate("/dashboard")} className="back-btn">
            <span className="back-icon">←</span>
            Back to Dashboard
          </button>
          <div className="list-info">
            <h1 className="list-title">{listTitle}</h1>
            <div className="task-summary">
              <span className="summary-item">
                <span className="summary-number">{getTotalActiveTasks()}</span>
                <span className="summary-label">Active Tasks</span>
              </span>
              <span className="summary-divider">•</span>
              <span className="summary-item">
                <span className="summary-number">{getTaskCount('done')}</span>
                <span className="summary-label">Completed</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="eisenhower-matrix">
        <div className="matrix-header">
          <h2 className="matrix-title">Eisenhower Matrix</h2>
          <p className="matrix-subtitle">Organize your tasks by importance and urgency</p>
        </div>

        <div className="matrix-grid">
          {["do", "schedule", "delegate", "delete"].map(bucket => {
            const config = getBucketConfig(bucket);
            return (
              <div key={bucket} className={`matrix-quadrant ${config.color}`}>
                <div className="quadrant-header">
                  <div className="quadrant-icon">{config.emoji}</div>
                  <div className="quadrant-info">
                    <h3 className="quadrant-title">{config.title}</h3>
                    <p className="quadrant-subtitle">{config.subtitle}</p>
                  </div>
                  <div className="task-count">
                    {getTaskCount(bucket)}
                  </div>
                </div>
                
                <div className="tasks-list">
                  {buckets[bucket]?.length === 0 ? (
                    <div className="empty-quadrant">
                      <span className="empty-icon">📝</span>
                      <p className="empty-text">No tasks in this category</p>
                    </div>
                  ) : (
                    buckets[bucket]?.map((task, index) => (
                      <div 
                        key={task.id} 
                        className={`task-item ${bucket === 'do' && index === 0 ? 'priority-task' : ''}`}
                      >
                        {editingTask === task.id ? (
                          // Edit Mode
                          <div className="task-edit-form">
                            <input
                              type="text"
                              value={editForm.taskName}
                              onChange={(e) => setEditForm({...editForm, taskName: e.target.value})}
                              className="edit-task-name"
                              placeholder="Task name"
                            />
                            <div className="edit-metrics">
                              <div className="metric-input">
                                <label>I:</label>
                                <select
                                  value={editForm.importance}
                                  onChange={(e) => setEditForm({...editForm, importance: e.target.value})}
                                >
                                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                              <div className="metric-input">
                                <label>U:</label>
                                <select
                                  value={editForm.urgency}
                                  onChange={(e) => setEditForm({...editForm, urgency: e.target.value})}
                                >
                                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                              <div className="metric-input">
                                <label>E:</label>
                                <select
                                  value={editForm.effort}
                                  onChange={(e) => setEditForm({...editForm, effort: e.target.value})}
                                >
                                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="edit-actions">
                              <button onClick={saveEdit} className="save-btn">Save</button>
                              <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div className="task-checkbox">
                              <input
                                type="checkbox"
                                checked={task.isDone}
                                onChange={() => toggleDone(task)}
                                id={`task-${task.id}`}
                              />
                              <label htmlFor={`task-${task.id}`} className="checkbox-custom"></label>
                            </div>
                            <div className="task-content">
                              <span className="task-name">{task.taskName}</span>
                              <div className="task-metrics">
                                <span className="metric">I: {task.importance}</span>
                                <span className="metric">U: {task.urgency}</span>
                                <span className="metric">E: {task.effort}</span>
                              </div>
                            </div>
                            <div className="task-actions">
                              <button 
                                onClick={() => startEdit(task)}
                                className="edit-btn"
                                title="Edit task"
                              >
                                ✏️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Tasks Section */}
        <div className="completed-section">
          <div className="completed-header">
            <div className="completed-info">
              <span className="completed-icon">✅</span>
              <h3 className="completed-title">Completed Tasks</h3>
            </div>
            <div className="completed-count">{getTaskCount('done')}</div>
          </div>
          
          {buckets.done?.length === 0 ? (
            <div className="empty-completed">
              <span className="empty-icon">🎯</span>
              <p className="empty-text">No completed tasks yet. Keep going!</p>
            </div>
          ) : (
            <div className="completed-tasks">
              {buckets.done?.map(task => (
                <div key={task.id} className="completed-task-item">
                  {editingTask === task.id ? (
                    // Edit Mode for completed tasks
                    <div className="task-edit-form">
                      <input
                        type="text"
                        value={editForm.taskName}
                        onChange={(e) => setEditForm({...editForm, taskName: e.target.value})}
                        className="edit-task-name"
                        placeholder="Task name"
                      />
                      <div className="edit-metrics">
                        <div className="metric-input">
                          <label>I:</label>
                          <select
                            value={editForm.importance}
                            onChange={(e) => setEditForm({...editForm, importance: e.target.value})}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="metric-input">
                          <label>U:</label>
                          <select
                            value={editForm.urgency}
                            onChange={(e) => setEditForm({...editForm, urgency: e.target.value})}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="metric-input">
                          <label>E:</label>
                          <select
                            value={editForm.effort}
                            onChange={(e) => setEditForm({...editForm, effort: e.target.value})}
                          >
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="edit-actions">
                        <button onClick={saveEdit} className="save-btn">Save</button>
                        <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    // View Mode for completed tasks
                    <>
                      <div className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={task.isDone}
                          onChange={() => toggleDone(task)}
                          id={`completed-task-${task.id}`}
                        />
                        <label htmlFor={`completed-task-${task.id}`} className="checkbox-custom"></label>
                      </div>
                      <div className="task-content">
                        <span className="task-name completed">{task.taskName}</span>
                        <div className="task-metrics">
                          <span className="metric">I: {task.importance}</span>
                          <span className="metric">U: {task.urgency}</span>
                          <span className="metric">E: {task.effort}</span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <button 
                          onClick={() => startEdit(task)}
                          className="edit-btn"
                          title="Edit task"
                        >
                          ✏️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
