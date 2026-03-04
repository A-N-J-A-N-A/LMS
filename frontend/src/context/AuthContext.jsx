import { createContext, useCallback, useContext, useMemo, useState } from "react";

const defaultAuthContextValue = {
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
  isAuthenticated: Boolean(localStorage.getItem("token")),
  login: (token, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  },
};

const AuthContext = createContext(defaultAuthContextValue);

const readAuthFromStorage = () => ({
  token: localStorage.getItem("token"),
  role: localStorage.getItem("role"),
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(readAuthFromStorage);

  const login = useCallback((token, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    setAuthState({ token, role });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setAuthState({ token: null, role: null });
  }, []);

  const value = useMemo(
    () => ({
      token: authState.token,
      role: authState.role,
      isAuthenticated: Boolean(authState.token),
      login,
      logout,
    }),
    [authState.role, authState.token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
