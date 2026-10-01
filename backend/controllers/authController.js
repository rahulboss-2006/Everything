const argon2 = require("argon2");
const crypto = require("crypto");

const User = require("../models/User");
const EmailOTP = require("../models/EmailOTP");
const { sendOTPEmail } = require("../utils/email");

const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/RefreshToken");

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

async function register(req, res) {
  try {
    const { email, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser && existingUser.emailVerified) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    let user;

    if (existingUser) {
      existingUser.passwordHash = passwordHash;
      existingUser.phone = normalizedPhone;
      existingUser.emailVerified = false;
      user = existingUser;
    } else {
      user = new User({
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        emailVerified: false,
        credits: 9999,
      });
    }

    await user.save();

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    await EmailOTP.deleteMany({
      email: normalizedEmail,
    });

    await EmailOTP.create({
      email: normalizedEmail,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTPEmail(normalizedEmail, otp);

    return res.status(201).json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
}

async function verifyEmail(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = await EmailOTP.findOne({
      email: normalizedEmail,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found",
      });
    }

    if (otpRecord.attempts >= 5) {
      await EmailOTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts",
      });
    }

    const submittedHash = hashOTP(otp);

    if (submittedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    user.emailVerified = true;

    await user.save();

    await EmailOTP.deleteOne({
      _id: otpRecord._id,
    });

    return res.json({
      success: true,
      message: "Email verified successfully",
      credits: user.credits,
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email",
    });
  }
}

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
    }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // à¦à¦•à¦‡ generic message à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à¦¾ à¦­à¦¾à¦²à§‹
    // à¦¯à¦¾à¦¤à§‡ account enumeration à¦•à¦ à¦¿à¦¨ à¦¹à§Ÿ
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    if (user.accountStatus === "deleted") {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
        accountStatus: "deleted",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    const passwordValid = await argon2.verify(
      user.passwordHash,
      password
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = createAccessToken(user);

    const refreshToken =
      createRefreshToken(user);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(
        Date.now() +
          30 * 24 * 60 * 60 * 1000
      ),
    });

    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokenHash = hashToken(token);

    const storedToken = await RefreshToken.findOne({
      tokenHash,
      userId: decoded.userId,
      revoked: false,
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or revoked",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid account",
      });
    }

    if (
      user.accountStatus === "deleted" ||
      user.active !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
        accountStatus: user.accountStatus || "inactive",
      });
    }

    // Old refresh token à¦à¦•à¦¬à¦¾à¦° à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦¹à¦²à§‡ revoke
    storedToken.revoked = true;
    await storedToken.save();

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(
        Date.now() +
          30 * 24 * 60 * 60 * 1000
      ),
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
}

async function me(req, res) {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      emailVerified: req.user.emailVerified,
      credits: req.user.credits,
    },
  });
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        {
          userId: req.user._id,
          tokenHash: hashToken(refreshToken),
        },
        {
          revoked: true,
        }
      );
    }

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
}

/* =========================================
   FORGOT PASSWORD
========================================= */

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    /*
      Generic response helps prevent
      account enumeration.
    */

    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    if (
      user.accountStatus === "deleted" ||
      user.active !== true
    ) {
      return res.json({
        success: true,
        message:
          "If an account exists with this email, a verification code has been sent.",
      });
    }

    /*
      Remove old password-reset OTPs
    */

    await EmailOTP.deleteMany({
      email: normalizedEmail,
      purpose: "password_reset",
    });

    /*
      Generate new OTP
    */

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    /*
      OTP valid for 5 minutes
    */

    await EmailOTP.create({
      email: normalizedEmail,
      otpHash,
      purpose: "password_reset",
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000
      ),
      attempts: 0,
    });

    /*
      Send OTP
    */

    await sendOTPEmail(
      normalizedEmail,
      otp
    );

    return res.json({
      success: true,
      message:
        "Password reset code sent to your email",
    });

  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send password reset code",
    });
  }
}

/* =========================================
   VERIFY PASSWORD RESET OTP
========================================= */

async function verifyResetOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const otpRecord =
      await EmailOTP.findOne({
        email: normalizedEmail,
        purpose: "password_reset",
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          "OTP expired or not found",
      });
    }

    /*
      Maximum 5 attempts
    */

    if (otpRecord.attempts >= 5) {
      await EmailOTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect attempts",
      });
    }

    const submittedHash =
      hashOTP(otp);

    if (
      submittedHash !==
      otpRecord.otpHash
    ) {
      otpRecord.attempts += 1;

      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code",
      });
    }

    /*
      OTP is correct.

      Do NOT delete it yet.
      resetPassword() will consume it
      after the new password is saved.
    */

    return res.json({
      success: true,
      message:
        "OTP verified successfully",
    });

  } catch (error) {
    console.error(
      "Verify reset OTP error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify reset code",
    });
  }
}

/* =========================================
   RESET PASSWORD
========================================= */

async function resetPassword(req, res) {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
      Find password-reset OTP
    */

    const otpRecord =
      await EmailOTP.findOne({
        email: normalizedEmail,
        purpose: "password_reset",
      });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message:
          "OTP expired or not found",
      });
    }

    /*
      Maximum attempts
    */

    if (otpRecord.attempts >= 5) {
      await EmailOTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect attempts",
      });
    }

    /*
      Verify OTP again
    */

    const submittedHash =
      hashOTP(otp);

    if (
      submittedHash !==
      otpRecord.otpHash
    ) {
      otpRecord.attempts += 1;

      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message:
          "Invalid verification code",
      });
    }

    /*
      Find user
    */

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to reset password",
      });
    }

    /*
      Hash new password
    */

    const passwordHash =
      await argon2.hash(
        newPassword,
        {
          type: argon2.argon2id,
        }
      );

    user.passwordHash =
      passwordHash;

    /*
      Make sure account remains active.
      A soft-deleted account must be restored
      by the admin restore flow instead.
    */

    if (user.accountStatus === "deleted") {
      return res.status(403).json({
        success: false,
        message:
          "This account has been deactivated. Please contact support.",
        accountStatus: "deleted",
      });
    }

    user.active = true;

    await user.save();

    /*
      OTP can no longer be used
    */

    await EmailOTP.deleteOne({
      _id: otpRecord._id,
    });

    /*
      Invalidate all existing
      refresh tokens.

      This logs out old sessions
      after password reset.
    */

    await RefreshToken.updateMany(
      {
        userId: user._id,
        revoked: false,
      },
      {
        $set: {
          revoked: true,
        },
      }
    );

    return res.json({
      success: true,
      message:
        "Password changed successfully",
    });

  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password",
    });
  }
}

module.exports = {
  register,
  verifyEmail,

  forgotPassword,
  verifyResetOTP,
  resetPassword,

  login,
  refreshToken,
  me,
  logout,
};


