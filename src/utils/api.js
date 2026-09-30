const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/* =========================================
   API REQUEST
========================================= */

export async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem("accessToken");

  const headers = {
    ...(options.headers || {}),
  };

  /*
    IMPORTANT:
    Refresh request should NOT receive
    the old access token.
  */

  const isRefreshRequest =
    endpoint === "/auth/refresh";

  if (token && !isRefreshRequest) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
        "Something went wrong."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}


/* =========================================
   ACCESS TOKEN
========================================= */

export function setAccessToken(token) {
  if (!token) return;

  localStorage.setItem(
    "accessToken",
    token
  );
}

export function getAccessToken() {
  return localStorage.getItem(
    "accessToken"
  );
}

export function clearAccessToken() {
  localStorage.removeItem(
    "accessToken"
  );
}


/* =========================================
   REFRESH TOKEN
========================================= */

export function setRefreshToken(token) {
  if (!token) return;

  localStorage.setItem(
    "refreshToken",
    token
  );
}

export function getRefreshToken() {
  return localStorage.getItem(
    "refreshToken"
  );
}

export function clearRefreshToken() {
  localStorage.removeItem(
    "refreshToken"
  );
}


/* =========================================
   CLEAR ALL AUTH TOKENS
========================================= */

export function clearAuthTokens() {
  clearAccessToken();
  clearRefreshToken();
}