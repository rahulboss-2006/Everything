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
const USER_CACHE_KEY = "authUser";

const PROACTIVE_REFRESH_MS = 12 * 60 * 1000;

export function AuthProvider({ children }) {
  /*
   * =========================================
   * INITIAL USER
   * =========================================
   *
   * Load cached user immediately.
   *
   * This prevents the navbar from showing
   * logged-out UI while /auth/me is loading.
   */

  const getCachedUser = () => {
    try {
      const cachedUser =
        localStorage.getItem(USER_CACHE_KEY);

      if (!cachedUser) {
        return null;
      }

      return JSON.parse(cachedUser);
    } catch {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
  };

  const [user, setUser] = useState(() =>
    getCachedUser()
  );

  /*
   * Because cached user is already available,
   * UI does not need to wait for /auth/me.
   */
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(false);
  const refreshTimerRef = useRef(null);
  const bootstrapPromiseRef = useRef(null);
  const scheduleRefreshRef = useRef(null);

  /*
   * =========================================
   * CACHE USER
   * =========================================
   */

  const saveUserCache = useCallback((userData) => {
    if (!userData) {
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }

    try {
      localStorage.setItem(
        USER_CACHE_KEY,
        JSON.stringify(userData)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  const clearUserCache = useCallback(() => {
    localStorage.removeItem(USER_CACHE_KEY);
  }, []);

  /*
   * =========================================
   * REFRESH TIMER
   * =========================================
   */

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearRefreshTimer();

    const accessToken =
      localStorage.getItem(ACCESS_TOKEN_KEY);

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
                ("00" +
                  char.charCodeAt(0).toString(16)
                ).slice(-2)
            )
            .join("")
        )
      );

      const expiresAt =
        Number(payload?.exp || 0) * 1000;

      if (!expiresAt) {
        return;
      }

      const timeUntilExpiry =
        expiresAt - Date.now();

      /*
       * Refresh before expiry.
       *
       * Minimum delay remains 5 seconds.
       */
      const delay = Math.max(
        5000,
        Math.min(
          PROACTIVE_REFRESH_MS,
          timeUntilExpiry - 60_000
        )
      );

      refreshTimerRef.current =
        window.setTimeout(async () => {
          try {
            const newAccessToken =
              await refreshAccessToken();

            if (!newAccessToken) {
              if (mountedRef.current) {
                setUser(null);
                clearUserCache();
                clearRefreshTimer();
              }

              return;
            }

            if (mountedRef.current) {
              scheduleRefreshRef.current?.();
            }
          } catch {
            if (mountedRef.current) {
              setUser(null);
              clearUserCache();
              clearRefreshTimer();
            }
          }
        }, delay);
    } catch {
      // Invalid JWT payload.
      // Normal authentication flow will handle it.
    }
  }, [
    clearRefreshTimer,
    clearUserCache,
  ]);

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  /*
   * =========================================
   * LOAD USER
   * =========================================
   */

  const loadUser = useCallback(async () => {
    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current;
    }

    bootstrapPromiseRef.current =
      (async () => {
        try {
          const data =
            await getCurrentUser();

          /*
           * Normal backend response:
           *
           * {
           *   success: true,
           *   user: {...}
           * }
           *
           * Also support:
           *
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
              saveUserCache(currentUser);
              scheduleRefresh();
            }

            return currentUser;
          }

          /*
           * Server says no user.
           */
          if (mountedRef.current) {
            setUser(null);
            clearUserCache();
            clearRefreshTimer();
          }

          return null;
        } catch {
          /*
           * IMPORTANT:
           *
           * Do NOT immediately remove cached user
           * just because /auth/me is temporarily slow
           * or the network has a temporary problem.
           *
           * If cached user exists, keep it.
           */

          if (mountedRef.current) {
            const cachedUser = getCachedUser();

            if (!cachedUser) {
              setUser(null);
              clearUserCache();
              clearRefreshTimer();
            }
          }

          return null;
        } finally {
          bootstrapPromiseRef.current = null;
        }
      })();

    return bootstrapPromiseRef.current;
  }, [
    clearRefreshTimer,
    scheduleRefresh,
    saveUserCache,
    clearUserCache,
  ]);

  /*
   * =========================================
   * BOOTSTRAP AUTH
   * =========================================
   */

  useEffect(() => {
    mountedRef.current = true;

    const accessToken =
      localStorage.getItem(
        ACCESS_TOKEN_KEY
      );

    const refreshToken =
      localStorage.getItem(
        REFRESH_TOKEN_KEY
      );

    /*
     * No tokens = definitely logged out.
     */
    if (!accessToken && !refreshToken) {
      setUser(null);
      clearUserCache();
      setLoading(false);

      return () => {
        mountedRef.current = false;
        clearRefreshTimer();
      };
    }

    /*
     * IMPORTANT:
     *
     * If cached user already exists,
     * UI is already rendered as logged in.
     *
     * Now verify silently in background.
     */
    const cachedUser = getCachedUser();

    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);

      /*
       * Start refresh scheduling immediately.
       */
      scheduleRefresh();
    } else {
      /*
       * No cached user.
       *
       * First-ever load needs /auth/me.
       */
      setLoading(true);
    }

    let cancelled = false;

    (async () => {
      try {
        await loadUser();
      } finally {
        if (
          !cancelled &&
          mountedRef.current
        ) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearRefreshTimer();
    };
  }, [
    clearRefreshTimer,
    loadUser,
    scheduleRefresh,
    clearUserCache,
  ]);

  /*
   * =========================================
   * LOGIN
   * =========================================
   */

  const login = useCallback(
    (userData) => {
      const loggedInUser =
        userData?.user ||
        userData?.data?.user ||
        userData ||
        null;

      if (loggedInUser) {
        /*
         * Update React immediately.
         */
        setUser(loggedInUser);

        /*
         * Save user so next page load is instant.
         */
        saveUserCache(loggedInUser);

        /*
         * Schedule token refresh.
         */
        scheduleRefresh();
      }

      return loggedInUser;
    },
    [
      scheduleRefresh,
      saveUserCache,
    ]
  );

  /*
   * =========================================
   * LOGOUT
   * =========================================
   */

  const logout = useCallback(async () => {
    clearRefreshTimer();

    try {
      await logoutUser();
    } catch {
      // Local logout must always complete.
    } finally {
      if (mountedRef.current) {
        setUser(null);
        clearUserCache();
        setLoading(false);
      }
    }
  }, [
    clearRefreshTimer,
    clearUserCache,
  ]);

  /*
   * =========================================
   * UPDATE CREDITS
   * =========================================
   */

  const updateCredits = useCallback(
    (credits) => {
      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        const updatedUser = {
          ...currentUser,
          credits,
        };

        /*
         * Keep cached user synchronized.
         */
        saveUserCache(updatedUser);

        return updatedUser;
      });
    },
    [saveUserCache]
  );

  /*
   * =========================================
   * REFRESH USER
   * =========================================
   */

  const refreshUser = useCallback(() => {
    return loadUser();
  }, [loadUser]);

  /*
   * =========================================
   * CONTEXT
   * =========================================
   */

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
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}