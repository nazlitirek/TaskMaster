import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./CreateTodo.css";

export default function CreateTodo() {
  const navigate = useNavigate();

  const [listTitle, setListTitle] = useState("");
  const [tasks, setTasks] = useState([
    { name: "", importance: 1, urgency: 1, effort: 1 },
  ]);
  const [error, setError] = useState("");

  const handleTaskChange = (index, field, value) => {
    const updatedTasks = [...tasks];
    updatedTasks[index][field] = value;
    setTasks(updatedTasks);
  };

  const addTaskRow = () => {
    setTasks([...tasks, { name: "", importance: 1, urgency: 1, effort: 1 }]);
  };

  const removeTaskRow = (index) => {
    const updatedTasks = [...tasks];
    updatedTasks.splice(index, 1);
    setTasks(updatedTasks);
  };
  // quadrant hesaplama
    function calcQuadrant(importance, urgency, thresholds = { importance: 3, urgency: 3 }) {
    const isImportant = importance >= thresholds.importance;
    const isUrgent = urgency >= thresholds.urgency;

    if (isImportant && isUrgent) return "do";        // Önemli + Acil
    if (isImportant && !isUrgent) return "schedule"; // Önemli + Acil değil
    if (!isImportant && isUrgent) return "delegate"; // Önemsiz + Acil
    return "delete";                                 // Önemsiz + Acil değil
    }


  const handleSave = async () => {
    // Validation
    if (!listTitle.trim()) {
      setError("List title boş olamaz!");
      return;
    }
    for (let task of tasks) {
      if (!task.name.trim()) {
        setError("Tüm task isimleri doldurulmalı!");
        return;
      }
      if (
        task.importance < 1 ||
        task.importance > 5 ||
        task.urgency < 1 ||
        task.urgency > 5 ||
        task.effort < 1 ||
        task.effort > 5
      ) {
        setError("Importance, Urgency ve Effort 1-5 arasında olmalı!");
        return;
      }
    }

    try {
      // Todo List ekle
      const listRef = await addDoc(collection(db, "todolists"), {
        title: listTitle,
        createdAt: serverTimestamp(),
      });

      // Tasks ekle
      for (let t of tasks) {
      const quadrant = calcQuadrant(t.importance, t.urgency);

      await addDoc(collection(db, "tasks"), {
        todolistId: listRef.id,
        taskName: t.name,
        importance: t.importance,
        urgency: t.urgency,
        effort: t.effort,
        quadrant, // 🚀 burada kategoriyi de kaydediyoruz
        createdAt: serverTimestamp(),
        isDone:false
      });
      }

      // Başarılı
      navigate("/dashboard");
    } catch (err) {
      console.error("Liste kaydedilemedi:", err);
      setError("Liste kaydedilirken bir hata oluştu.");
    }
  };

  return (
    <div className="create-todo-container">
      <div className="header-section">
        <button onClick={() => navigate("/dashboard")} className="back-btn">
          <span className="back-icon">←</span>
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1 className="page-title">Create New List</h1>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="form-section">
        <div className="input-group">
          <input
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            className="title-input"
            placeholder="Enter your list title..."
          />
        </div>

        <div className="tasks-section">
          <div className="section-header">
          </div>

          <div className="table-container">
            <div className="table-header">
              <div className="header-cell task-name">Task Name</div>
              <div className="header-cell">Importance</div>
              <div className="header-cell">Urgency</div>
              <div className="header-cell">Effort</div>
              <div className="header-cell actions"></div>
            </div>

            <div className="table-body">
              {tasks.map((task, index) => (
                <div key={index} className="task-row">
                  <div className="input-cell task-name">
                    <label className="mobile-label">Task Name</label>
                    <input
                      type="text"
                      placeholder="Enter task name..."
                      value={task.name}
                      onChange={(e) => handleTaskChange(index, "name", e.target.value)}
                      className="task-input"
                    />
                  </div>
                  <div className="input-cell" data-label="Importance:">
                    <select
                      value={task.importance}
                      onChange={(e) =>
                        handleTaskChange(index, "importance", Number(e.target.value))
                      }
                      className={`select-input importance-${task.importance}`}
                    >
                      <option value={1}>1 - Very Low</option>
                      <option value={2}>2 - Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                      <option value={5}>5 - Very High</option>
                    </select>
                  </div>
                  <div className="input-cell" data-label="Urgency:">
                    <select
                      value={task.urgency}
                      onChange={(e) =>
                        handleTaskChange(index, "urgency", Number(e.target.value))
                      }
                      className={`select-input urgency-${task.urgency}`}
                    >
                      <option value={1}>1 - Very Low</option>
                      <option value={2}>2 - Low</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - High</option>
                      <option value={5}>5 - Very High</option>
                    </select>
                  </div>
                  <div className="input-cell" data-label="Effort:">
                    <select
                      value={task.effort}
                      onChange={(e) =>
                        handleTaskChange(index, "effort", Number(e.target.value))
                      }
                      className={`select-input effort-${task.effort}`}
                    >
                      <option value={1}>1 - Very Easy</option>
                      <option value={2}>2 - Easy</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4 - Hard</option>
                      <option value={5}>5 - Very Hard</option>
                    </select>
                  </div>
                  <div className="input-cell actions">
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTaskRow(index)}
                        className="delete-btn"
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="table-footer">
              <button onClick={addTaskRow} className="add-task-btn">
                <span className="plus-icon">+</span>
                Add Task
              </button>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={() => navigate("/dashboard")}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="save-btn"
          >
            <span className="save-icon">💾</span>
            Save List
          </button>
        </div>
      </div>
    </div>
  );
}
