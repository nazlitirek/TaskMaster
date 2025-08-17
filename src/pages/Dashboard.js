import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

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

  if (!currentUser) return <p>Giriş yapılmadı.</p>;

  const lastThree = todoLists.slice(0, 3);

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h2>Dashboard</h2>
        <div>
          <span>{currentUser.email}</span>
          <button onClick={() => signOut(auth)}>Logout</button>
        </div>
      </nav>

      <main>
        <h1>Hoşgeldin, {currentUser.email}</h1>
        <p>Burası senin panelin 🚀</p>

        <div className="cards-container" style={{ display: "flex", gap: "20px" }}>
          {/* 1. Card */}
          <div className="card" style={cardStyle} onClick={() => navigate("/createTodo")}>
            <h3>Create a To-Do List</h3>
            <p>Yeni bir görev listesi oluştur.</p>
          </div>

          {/* 2. Card */}
          <div className="card" style={cardStyle} onClick={() => navigate("/allTodo")}>
            <h3>All To-Do Lists</h3>
            
          </div>

          {/* 3. Card */}
<div className="card" style={cardStyle}>
  <h3>Last Three To-Do Lists</h3>
  {lastThree.map(list => (
    <div
      key={list.id}
      onClick={() => navigate(`/todolist/${list.id}`)}
      style={{
        cursor: "pointer",
        marginBottom: "10px",
        padding: "10px",
        backgroundColor: "#f5f5f5",
        borderRadius: "5px",
      }}
    >
      <strong>{list.title}</strong>
    </div>
  ))}
</div>

        </div>
      </main>
    </div>
  );
}

const cardStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  borderRadius: "10px",
  width: "300px",
  cursor: "pointer",
  boxShadow: "2px 2px 12px rgba(0,0,0,0.1)"
};
