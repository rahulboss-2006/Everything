import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  logoutUser,
  refreshAccessToken,
} from "../services/authApi";

const AuthContext =
  createContext(null);


/* =========================================
   AUTH PROVIDER
========================================= */

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  /* =========================================
     LOAD USER
  ========================================= */

  async function loadUser() {
    try {
      /*
        First try current access token.
      */

      const data =
        await getCurrentUser();

      if (
        data?.success &&
        data?.user
      ) {
        setUser(data.user);
        return data.user;
      }

      setUser(null);

      return null;

    } catch (error) {

      /*
        Only 401 should trigger
        refresh attempt.

        Other errors should not
        be treated as expired token.
      */

      if (error?.status !== 401) {
        console.error(
          "Load user failed:",
          error
        );

        setUser(null);

        return null;
      }


      /* =====================================
         TRY REFRESH
      ===================================== */

      try {
        await refreshAccessToken();

        /*
          New access token has now
          been saved.

          Request /auth/me again.
        */

        const data =
          await getCurrentUser();

        if (
          data?.success &&
          data?.user
        ) {
          setUser(data.user);

          return data.user;
        }

        setUser(null);

        return null;

      } catch (refreshError) {

        /*
          Refresh token itself is
          invalid/expired/revoked.

          refreshAccessToken()
          already clears the tokens
          when backend returns 401/403.
        */

        console.error(
          "Authentication refresh failed:",
          refreshError
        );

        setUser(null);

        return null;
      }
    }
  }


  /* =========================================
     INITIAL AUTH
  ========================================= */

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const accessToken =
        localStorage.getItem(
          "accessToken"
        );

      const refreshToken =
        localStorage.getItem(
          "refreshToken"
        );

      /*
        No token = logged out user.

        Do not call /auth/me.
      */

      if (
        !accessToken &&
        !refreshToken
      ) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      try {
        await loadUser();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);


  /* =========================================
     LOGIN
  ========================================= */

  async function login(userData) {
    /*
      loginUser() already saves:

      accessToken
      refreshToken
    */

    if (userData?.user) {
      setUser(userData.user);
    } else {
      setUser(userData);
    }
  }


  /* =========================================
     LOGOUT
  ========================================= */

  async function logout() {
    try {
      await logoutUser();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      /*
        Always remove user from
        React state.
      */

      setUser(null);
    }
  }


  /* =========================================
     UPDATE CREDITS
  ========================================= */

  function updateCredits(
    credits
  ) {
    setUser(
      (currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        return {
          ...currentUser,
          credits,
        };
      }
    );
  }


  /* =========================================
     CONTEXT VALUE
  ========================================= */

  const value = {
    user,
    loading,

    login,
    logout,

    updateCredits,

    refreshUser: loadUser,
  };


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


/* =========================================
   USE AUTH
========================================= */

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