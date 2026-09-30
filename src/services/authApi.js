import {
  apiRequest,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthTokens,
} from "../utils/api";


/* =========================================
   REGISTER
========================================= */

export async function registerUser(
  email,
  password,
  phone
) {
  return apiRequest(
    "/auth/register",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
        password,
        phone,
      }),
    }
  );
}


/* =========================================
   VERIFY EMAIL
========================================= */

export async function verifyEmail(
  email,
  otp
) {
  return apiRequest(
    "/auth/verify-email",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );
}


/* =========================================
   LOGIN
========================================= */

export async function loginUser(
  email,
  password
) {
  const data =
    await apiRequest(
      "/auth/login",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  /*
    Save access token
  */

  if (data?.accessToken) {
    setAccessToken(
      data.accessToken
    );
  }

  /*
    Save refresh token
  */

  if (data?.refreshToken) {
    setRefreshToken(
      data.refreshToken
    );
  }

  return data;
}


/* =========================================
   CURRENT USER
========================================= */

export async function getCurrentUser() {
  return apiRequest(
    "/auth/me",
    {
      method: "GET",
    }
  );
}


/* =========================================
   REFRESH ACCESS TOKEN
========================================= */

export async function refreshAccessToken() {
  const refreshToken =
    getRefreshToken();

  /*
    No refresh token
  */

  if (!refreshToken) {
    const error =
      new Error(
        "No refresh token available."
      );

    error.status = 401;

    throw error;
  }

  try {
    /*
      IMPORTANT:

      apiRequest() will NOT attach
      the old access token because
      this is /auth/refresh.

      Only refreshToken is sent.
    */

    const data =
      await apiRequest(
        "/auth/refresh",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            refreshToken,
          }),
        }
      );

    /*
      New access token
    */

    if (data?.accessToken) {
      setAccessToken(
        data.accessToken
      );
    }

    /*
      Refresh-token rotation

      Backend may return a new
      refresh token.
    */

    if (data?.refreshToken) {
      setRefreshToken(
        data.refreshToken
      );
    }

    return data;

  } catch (error) {

    /*
      If backend says refresh token
      is invalid/revoked/expired,
      these tokens cannot be used
      anymore.

      Clear them so the application
      does not enter an infinite
      authentication loop.
    */

    if (
      error?.status === 401 ||
      error?.status === 403
    ) {
      clearAuthTokens();
    }

    throw error;
  }
}


/* =========================================
   LOGOUT
========================================= */

export async function logoutUser() {
  try {
    const refreshToken =
      getRefreshToken();

    /*
      If there is no refresh token,
      there is nothing to send.
    */

    if (refreshToken) {
      await apiRequest(
        "/auth/logout",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            refreshToken,
          }),
        }
      );
    }

  } finally {
    /*
      Always clear local tokens.
    */

    clearAuthTokens();
  }
}

/* =========================================
   FORGOT PASSWORD
========================================= */

export async function forgotPassword(
  email
) {
  return apiRequest(
    "/auth/forgot-password",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
      }),
    }
  );
}


/* =========================================
   VERIFY RESET OTP
========================================= */

export async function verifyResetOTP(
  email,
  otp
) {
  return apiRequest(
    "/auth/verify-reset-otp",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
        otp,
      }),
    }
  );
}


/* =========================================
   RESET PASSWORD
========================================= */

export async function resetPassword(
  email,
  otp,
  newPassword
) {
  return apiRequest(
    "/auth/reset-password",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        email,
        otp,
        newPassword,
      }),
    }
  );
}