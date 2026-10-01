const express = require("express");

const {
  register,
  verifyEmail,

  forgotPassword,
  verifyResetOTP,
  resetPassword,

  login,
  refreshToken,
  me,
  logout,
} = require("../controllers/authController");

const protect = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/me", protect, me);
router.post("/logout", protect, logout);
module.exports = router;