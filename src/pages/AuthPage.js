import { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Auth.css";


export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Logged in!");
      navigate("/dashboard");
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Registered! Please login.");
      setIsLogin(true);
      setEmail("");
      setPassword("");
    }
  } catch (err) {
    // Firebase error handling:
    switch (err.code) {
  case "auth/user-not-found":
    setError("Bu email ile kayıtlı kullanıcı bulunamadı.");
    break;
  case "auth/wrong-password":
    setError("Yanlış şifre girdiniz.");
    break;
  case "auth/invalid-email":
    setError("Geçersiz email adresi.");
    break;
  case "auth/invalid-credential":
    setError("Geçersiz kimlik bilgileri.");
    break;
  case "auth/email-already-in-use":
    setError("Bu email zaten kayıtlı.");
    if (!isLogin) setIsLogin(true);
    break;
  case "auth/weak-password":
    setError("Şifreniz çok zayıf, en az 6 karakter olmalı.");
    break;
  default:
    setError("Bir hata oluştu: " + err.message);
}

    
  } finally {
    setLoading(false);
  }
};

  const toggleMode = () => {
    setError("");
    setIsLogin(!isLogin);
  };

  return (
    <div className="auth-container">
      <div className="welcome-section">
        <h2>{isLogin ? "Welcome Back!" : "Create Your Account"}</h2>
        <p>{isLogin ? "Join Our Unique Platform, Explore a New Experience" : "Start your journey with us!"}</p>
        <button onClick={toggleMode}>
          {isLogin ? "Go to Register" : "Go to Login"}
        </button>
      </div>

      <div className="form-section">
        <h2>{isLogin ? "Sign In" : "Register"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          {isLogin && (
            <div className="form-options">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />{" "}
                Remember me
              </label>
              <a href="/">Forgot password?</a>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? (isLogin ? "Logging in..." : "Registering...") : isLogin ? "LOGIN" : "REGISTER"}
          </button>
        </form>
      </div>
    </div>
  );
}
