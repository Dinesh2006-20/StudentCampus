import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, TOKEN_KEY } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  }, []);

  const finish = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };
  const login = useCallback(async (email, password) => finish((await api.post("/auth/login", { email, password })).data), []);
  const register = useCallback(async (body) => finish((await api.post("/auth/register", body)).data), []);
  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setUser(false);
  }, []);

  return <AuthCtx.Provider value={{ user, setUser, login, register, logout }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
