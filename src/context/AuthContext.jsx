import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getCurrentUser,
  logoutUser,
  refreshAccessToken,
} from "../services/authApi";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const PROACTIVE_REFRESH_MS = 12 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(false);
  const refreshTimerRef = useRef(null);
  const bootstrapPromiseRef = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearRefreshTimer();

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      return;
    }

    try {
      const parts = accessToken.split(".");

      if (parts.length !== 3) {
        return;
      }

      const base64 = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split("")
            .map(
              (char) =>
                "%" +
                ("00" + char.charCodeAt(0).toString(16)).slice(-2)
            )
            .join("")
        )
      );

      const expiresAt = Number(payload?.exp || 0) * 1000;

      if (!expiresAt) {
        return;
      }

      const timeUntilExpiry = expiresAt - Date.now();

      const delay = Math.max(
        5000,
        Math.min(
          PROACTIVE_REFRESH_MS,
          timeUntilExpiry - 60_000
        )
      );

      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const newAccessToken = await refreshAccessToken();

          if (!newAccessToken) {
            if (mountedRef.current) {
              setUser(null);
              clearRefreshTimer();
            }
            return;
          }

          if (mountedRef.current) {
            scheduleRefresh();
          }
        } catch {
          if (mountedRef.current) {
            setUser(null);
            clearRefreshTimer();
          }
        }
      }, delay);
    } catch {
      // Invalid JWT payload.
      // Normal API authentication flow will handle it.
    }
  }, [clearRefreshTimer]);

  const loadUser = useCallback(async () => {
    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current;
    }

    bootstrapPromiseRef.current = (async () => {
      try {
        const data = await getCurrentUser();

        /*
         * Support the normal backend response:
         * {
         *   success: true,
         *   user: {...}
         * }
         *
         * Also tolerate:
         * {
         *   data: {
         *     user: {...}
         *   }
         * }
         */
        const currentUser =
          data?.user ||
          data?.data?.user ||
          null;

        if (currentUser) {
          if (mountedRef.current) {
            setUser(currentUser);
            scheduleRefresh();
          }

          return currentUser;
        }

        if (mountedRef.current) {
          setUser(null);
          clearRefreshTimer();
        }

        return null;
      } catch (error) {
        if (mountedRef.current) {
          setUser(null);
          clearRefreshTimer();
        }

        return null;
      } finally {
        bootstrapPromiseRef.current = null;
      }
    })();

    return bootstrapPromiseRef.current;
  }, [clearRefreshTimer, scheduleRefresh]);

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken && !refreshToken) {
      setUser(null);
      setLoading(false);

      return () => {
        cancelled = true;
        mountedRef.current = false;
        clearRefreshTimer();
      };
    }

    (async () => {
      try {
        await loadUser();
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, loadUser]);

  /*
   * Called after successful login from the Login page.
   */
  const login = useCallback(
    (userData) => {
      const loggedInUser =
        userData?.user ||
        userData?.data?.user ||
        userData ||
        null;

      if (loggedInUser) {
        setUser(loggedInUser);
        scheduleRefresh();
      }

      return loggedInUser;
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();

    try {
      await logoutUser();
    } catch {
      // Local logout must always complete.
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
      }
    }
  }, [clearRefreshTimer]);

  const updateCredits = useCallback((credits) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        credits,
      };
    });
  }, []);

  const refreshUser = useCallback(() => {
    return loadUser();
  }, [loadUser]);

  const value = {
    user,
    loading,
    login,
    logout,
    updateCredits,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
