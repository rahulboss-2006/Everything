import {
  apiJson,
  getRefreshToken,
  setTokens,
  clearTokens,
  refreshAccessTokenOnce,
} from "../utils/api";

export const loginUser = async (credentials) => {
  const data = await apiJson("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (data?.accessToken) {
    setTokens(data.accessToken, data.refreshToken);
  }

  return data;
};

export const registerUser = async (userData) => {
  const data = await apiJson("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  if (data?.accessToken) {
    setTokens(data.accessToken, data.refreshToken);
  }

  return data;
};

export const getCurrentUser = async () => {
  return apiJson("/auth/me", {
    method: "GET",
  });
};

export const verifyEmail = async (verificationData) => {
  return apiJson("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(verificationData),
  });
};

export const forgotPassword = async (email) => {
  return apiJson("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email,
    }),
  });
};

export const verifyResetOTP = async (email, otp) => {
  return apiJson("/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({
      email,
      otp,
    }),
  });
};

export const resetPassword = async (
  email,
  otp,
  newPassword
) => {
  return apiJson("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      email,
      otp,
      newPassword,
    }),
  });
};

export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearTokens();
    return null;
  }

  return refreshAccessTokenOnce();
};

export const logoutUser = async () => {
  const refreshToken = getRefreshToken();

  try {
    if (refreshToken) {
      await apiJson(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({
            refreshToken,
          }),
        },
        false
      );
    }
  } catch {
    // Logout should still complete locally.
  } finally {
    clearTokens();
  }

  return true;
};

export default {
  loginUser,
  registerUser,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  refreshAccessToken,
  logoutUser,
};
