import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const quadrantLabels = {
  do: "🟥 DO",
  schedule: "🟧 SCHEDULE",
  delegate: "🟨 DELEGATE",
  delete: "⬜ DELETE",
};

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

  // Quadrant hesaplama
  const calcQuadrant = (importance, urgency, thresholds = { importance: 3, urgency: 3 }) => {
    const isImportant = importance >= thresholds.importance;
    const isUrgent = urgency >= thresholds.urgency;
    if (isImportant && isUrgent) return "do";
    if (isImportant && !isUrgent) return "schedule";
    if (!isImportant && isUrgent) return "delegate";
    return "delete";
  };

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
        task.importance < 1 || task.importance > 5 ||
        task.urgency < 1 || task.urgency > 5 ||
        task.effort < 1 || task.effort > 5
      ) {
        setError("Importance, Urgency ve Effort 1-5 arasında olmalı!");
        return;
      }
    }

    try {
      const listRef = await addDoc(collection(db, "todolists"), {
        listTitle,
        createdAt: serverTimestamp(),
      });

      for (let t of tasks) {
        const quadrant = calcQuadrant(t.importance, t.urgency);
        await addDoc(collection(db, "tasks"), {
          todolistId: listRef.id,
          name: t.name,
          importance: t.importance,
          urgency: t.urgency,
          effort: t.effort,
          quadrant,
          createdAt: serverTimestamp(),
          isDone: false,
        });
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Liste kaydedilemedi:", err);
      setError("Liste kaydedilirken bir hata oluştu.");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h2>Create a New To-Do List</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginBottom: "20px" }}>
        <label>List Title:</label>
        <input
          type="text"
          value={listTitle}
          onChange={(e) => setListTitle(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />
      </div>

      <h3>Tasks</h3>
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
          gap: "10px",
          marginBottom: "10px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        <span>Task Name</span>
        <span>Importance</span>
        <span>Urgency</span>
        <span>Effort</span>
        <span>Quadrant</span>
        <span></span>
      </div>

      {tasks.map((task, index) => {
        const quadrant = calcQuadrant(task.importance, task.urgency);
        return (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
              gap: "10px",
              marginBottom: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Task Name"
              value={task.name}
              onChange={(e) => handleTaskChange(index, "name", e.target.value)}
            />
            <input
              type="number"
              min="1"
              max="5"
              value={task.importance}
              onChange={(e) =>
                handleTaskChange(index, "importance", Number(e.target.value))
              }
            />
            <input
              type="number"
              min="1"
              max="5"
              value={task.urgency}
              onChange={(e) =>
                handleTaskChange(index, "urgency", Number(e.target.value))
              }
            />
            <input
              type="number"
              min="1"
              max="5"
              value={task.effort}
              onChange={(e) =>
                handleTaskChange(index, "effort", Number(e.target.value))
              }
            />
            <span style={{ textAlign: "center", fontWeight: "bold" }}>
              {quadrantLabels[quadrant]}
            </span>
            <button
              onClick={() => removeTaskRow(index)}
              style={{
                padding: "5px 10px",
                background: "#ff4d4f",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        );
      })}

      <button
        onClick={addTaskRow}
        style={{
          marginBottom: "20px",
          padding: "8px 12px",
          background: "#1890ff",
          color: "white",
          border: "none",
          borderRadius: "3px",
          cursor: "pointer",
        }}
      >
        Add Task
      </button>

      <div>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 20px",
            background: "green",
            color: "white",
            fontSize: "16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Save To-Do List
        </button>
      </div>
    </div>
  );
}
