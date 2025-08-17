import React, { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";  // Firebase config dosyan

// 1- Context oluşturduk
export const AuthContext = createContext();

// 2- Provider oluşturduk
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase auth state değişimini dinliyoruz
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // kullanıcı değiştiğinde güncelle
      setLoading(false);    // yüklenme bitti
    });

    // Cleanup - dinlemeyi kapat
    return () => unsubscribe();
  }, []);

  // Loading bitmeden çocukları render etme (sayfa açılırken boş göstermez)
  return (
    <AuthContext.Provider value={{ currentUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
