import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function TodolistPage() {
  const { id } = useParams(); // todolistId
  const [buckets, setBuckets] = useState({ do: [], schedule: [], delegate: [], delete: [], done: [] });

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
    const fetchTasks = async () => {
      const q = query(
        collection(db, "tasks"),
        where("todolistId", "==", id),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(q);
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBuckets(categorizeTasksStable(allTasks));
    };

    fetchTasks();
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


  return (
    <div>
      <h2>Todolist</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        {["do","schedule","delegate","delete","done"].map(bucket => (
          <div key={bucket} style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "5px", flex: 1 }}>
            <h3>{bucket.toUpperCase()}</h3>
            {buckets[bucket]?.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={() => toggleDone(task)}
                  style={{ marginRight: "8px" }}
                />
                <span>{task.name} (Imp: {task.importance}, Urg: {task.urgency}, Eff: {task.effort})</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
