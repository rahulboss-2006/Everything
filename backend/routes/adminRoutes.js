const express = require("express");
const rateLimit = require("express-rate-limit");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const {
  getDashboard,
  getUsers,
  getPayments,
  getContacts,
  getAuditLogs,
  updateUser,
  deleteUser,
  approvePayment,
  rejectPayment,
  deletePayment,
  updateContact,
  deleteContact,
  logout,
} = require("../controllers/adminController");

const requireAdmin = require("../middleware/adminAuth");

const router = express.Router();

/* =========================================================
   ADMIN LOGIN
========================================================= */

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin login attempts. Please try again later.",
  },
});

router.post("/login", adminLoginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body?.password || "");

    const adminEmail = String(process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !passwordHash) {
      console.error(
        "ADMIN_EMAIL or ADMIN_PASSWORD_HASH is missing."
      );

      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured.",
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (email !== adminEmail) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const validPassword = await argon2.verify(
      passwordHash,
      password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const secret = process.env.ADMIN_JWT_SECRET;

    if (!secret) {
      console.error("ADMIN_JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured.",
      });
    }

    const accessToken = jwt.sign(
      {
        type: "admin",
        email: adminEmail,
      },
      secret,
      {
        expiresIn: "8h",
      }
    );

    return res.json({
      success: true,
      accessToken,
      admin: {
        email: adminEmail,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Admin login failed.",
    });
  }
});

/* =========================================================
   PROTECTED ADMIN ROUTES
========================================================= */

router.use(requireAdmin);

/* =========================================================
   ADMIN SESSION
========================================================= */

router.get("/me", (req, res) => {
  return res.json({
    success: true,
    admin: {
      email: req.admin.email,
    },
  });
});

/* =========================================================
   DASHBOARD
========================================================= */

router.get("/dashboard", getDashboard);

/* =========================================================
   USERS
========================================================= */

router.get("/users", getUsers);

router.patch(
  "/users/:id",
  updateUser
);

router.delete(
  "/users/:id",
  deleteUser
);

/* =========================================================
   PAYMENTS
========================================================= */

router.get("/payments", getPayments);

router.post(
  "/payments/:id/approve",
  approvePayment
);

router.post(
  "/payments/:id/reject",
  rejectPayment
);

/* =========================================================
   CONTACT MESSAGES
========================================================= */

router.get("/contacts", getContacts);

router.patch(
  "/contacts/:id",
  updateContact
);

router.delete(
  "/contacts/:id",
  deleteContact
);

/* =========================================================
   AUDIT LOGS
========================================================= */

router.get(
  "/audit-logs",
  getAuditLogs
);

/* =========================================================
   LOGOUT
========================================================= */

router.post(
  "/logout",
  logout
);

module.exports = router;


