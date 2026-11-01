import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App khulte hi ek baar poochho: "main logged in hoon?"
  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      try {
        const res = await fetch("/api/v1/users/me", { credentials: "include" });
        if (!res.ok) throw new Error("Not logged in");
        const json = await res.json();
        if (!ignore) setUser(json.data.doc ?? json.data.data);
      } catch {
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadUser();
    return () => {
      ignore = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/v1/users/logout", { credentials: "include" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
