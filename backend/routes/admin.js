const express = require("express");
const rateLimit = require("express-rate-limit");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Payment = require("../models/Payment");
const ContactMessage = require("../models/ContactMessage");
const AdminAuditLog = require("../models/AdminAuditLog");
const RefreshToken = require("../models/RefreshToken");
const EmailOTP = require("../models/EmailOTP");
const { sendAccountDeletionEmail } = require("../utils/email");
const requireAdmin = require("../middleware/adminAuth");
const { applyVerifiedPayment } = require("../services/paymentService");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many admin login attempts. Try again later." },
});

function getAdminCredentials() {
  return {
    email: String(process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    passwordHash: String(process.env.ADMIN_PASSWORD_HASH || ""),
  };
}

async function audit(req, action, targetType = "system", targetId = "", details = {}) {
  try {
    await AdminAuditLog.create({
      adminEmail: req.admin?.email || "",
      action,
      targetType,
      targetId: String(targetId || ""),
      details,
      ip: req.ip || "",
    });
  } catch (error) {
    console.error("Admin audit log error:", error);
  }
}

function createAdminToken(email) {
  return jwt.sign(
    { type: "admin", email },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: "8h" }
  );
}

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const { email: adminEmail, passwordHash } = getAdminCredentials();

    if (!email || !password || !adminEmail || !passwordHash) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const valid = await argon2.verify(passwordHash, password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const token = createAdminToken(adminEmail);

    await AdminAuditLog.create({
      adminEmail,
      action: "admin.login",
      targetType: "system",
      ip: req.ip || "",
    });

    return res.json({
      success: true,
      accessToken: token,
      admin: { email: adminEmail },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Unable to login as admin." });
  }
});

router.use(requireAdmin);

router.get("/me", (req, res) => {
  res.json({ success: true, admin: { email: req.admin.email } });
});

router.get("/dashboard", async (_req, res) => {
  try {
    const normalUserFilter = { accountStatus: { $ne: "deleted" } };

    const [users, activeUsers, verifiedUsers, pendingPayments, completedPayments, failedPayments, revenue, unreadMessages] = await Promise.all([
      User.countDocuments(normalUserFilter),
      User.countDocuments({ ...normalUserFilter, active: true }),
      User.countDocuments({ ...normalUserFilter, emailVerified: true }),
      Payment.countDocuments({ status: { $in: ["created", "pending"] } }),
      Payment.countDocuments({ status: "completed" }),
      Payment.countDocuments({ status: { $in: ["failed", "cancelled"] } }),
      Payment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$amount" }, credits: { $sum: "$credits" } } },
      ]),
      ContactMessage.countDocuments({ status: "unread" }),
    ]);

    const latestPayments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("user", "email")
      .lean();

    return res.json({
      success: true,
      stats: {
        users,
        activeUsers,
        verifiedUsers,
        pendingPayments,
        completedPayments,
        failedPayments,
        unreadMessages,
        revenue: revenue[0]?.total || 0,
        creditsSold: revenue[0]?.credits || 0,
      },
      latestPayments,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({ success: false, message: "Could not load dashboard." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || "").trim();
    const filter = {};

    if (search) {
      filter.email = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const [items, total] = await Promise.all([
      User.find(filter).select("email phone credits emailVerified active accountStatus deletedAt deletedReason deletedBy googleId facebookId createdAt updatedAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ success: false, message: "Could not load users." });
  }
});


router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();
    const sendEmail = req.body?.sendEmail !== false;

    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason must be at least 5 characters.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.accountStatus === "deleted") {
      return res.status(400).json({
        success: false,
        message: "User is already deleted.",
      });
    }

    const email = user.email;

    let emailSent = false;

    if (sendEmail && email) {
      try {
        await sendAccountDeletionEmail(email, reason);
        emailSent = true;
      } catch (emailError) {
        console.error("Account deletion email error:", emailError);
      }
    }

    // Revoke existing sessions and OTPs.
    await Promise.all([
      RefreshToken.deleteMany({ userId: user._id }),
      EmailOTP.deleteMany({ email }),
    ]);

    // SOFT DELETE:
    // Keep the same User document and _id so payment history
    // continues to populate the user's email.
    user.active = false;
    user.accountStatus = "deleted";
    user.deletedAt = new Date();
    user.deletedReason = reason;
    user.deletedBy =
      req.admin?.email ||
      req.user?.email ||
      "admin";

    await user.save();

    await audit(req, "delete_user", "user", user._id, {
      email,
      reason,
      accountStatus: "deleted",
      deletedAt: user.deletedAt,
      deletedBy: user.deletedBy,
    });

    return res.json({
      success: true,
      message: "User account deactivated successfully.",
      user: {
        _id: user._id,
        email: user.email,
        active: user.active,
        accountStatus: user.accountStatus,
        deletedAt: user.deletedAt,
        deletedReason: user.deletedReason,
        deletedBy: user.deletedBy,
      },
      email: {
        sent: emailSent,
      },
    });
  } catch (error) {
    console.error("Admin delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not deactivate user.",
    });
  }
});

router.post("/users/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.accountStatus !== "deleted") {
      return res.status(400).json({
        success: false,
        message: "User is not in deleted status.",
      });
    }

    // Restore the SAME user document and SAME _id.
    user.active = true;
    user.accountStatus = "active";
    user.deletedAt = null;
    user.deletedReason = null;
    user.deletedBy = null;

    await user.save();

    await audit(req, "restore_user", "user", user._id, {
      email: user.email,
      accountStatus: "active",
    });

    return res.json({
      success: true,
      message: "User account restored successfully.",
      user: {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        credits: user.credits,
        emailVerified: user.emailVerified,
        active: user.active,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Admin restore user error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not restore user.",
    });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const allowed = {};
    if (req.body.credits !== undefined) {
      const credits = Number(req.body.credits);
      if (!Number.isFinite(credits) || credits < 0) return res.status(400).json({ success: false, message: "Credits must be a non-negative number." });
      allowed.credits = credits;
    }
    if (req.body.active !== undefined) {
      const existingUser = await User.findById(req.params.id);

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const nextActive = Boolean(req.body.active);

      if (
        existingUser.accountStatus === "deleted" &&
        nextActive === true
      ) {
        return res.status(400).json({
          success: false,
          message: "Use the restore action to reactivate a deleted user.",
        });
      }

      allowed.active = nextActive;
    }
    if (req.body.emailVerified !== undefined) allowed.emailVerified = Boolean(req.body.emailVerified);

    if (!Object.keys(allowed).length) return res.status(400).json({ success: false, message: "No editable fields supplied." });

    const user = await User.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true }).select("email phone credits emailVerified active createdAt updatedAt");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    await audit(req, "user.update", "user", user._id, allowed);
    res.json({ success: true, user });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ success: false, message: "Could not update user." });
  }
});

/* =========================================================
   PAYMENTS
========================================================= */

router.get("/payments", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = String(req.query.status || "").trim();
    const provider = String(req.query.provider || "").trim();
    const filter = {};
    if (["created", "pending", "completed", "failed", "cancelled"].includes(status)) filter.status = status;
    if (["bkash", "nagad"].includes(provider)) filter.provider = provider;

    const [items, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "email credits active").lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Admin payments error:", error);
    res.status(500).json({ success: false, message: "Could not load payments." });
  }
});

router.post("/payments/:id/approve", async (req, res) => {
  try {
    const transactionId = String(req.body?.transactionId || "").trim();
    const verifiedAmount = Number(req.body?.amount);

    if (!transactionId) return res.status(400).json({ success: false, message: "Transaction ID is required." });
    if (!Number.isFinite(verifiedAmount) || verifiedAmount < 10) return res.status(400).json({ success: false, message: "Valid amount is required." });

    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found." });
    if (payment.status === "completed" || payment.creditsApplied) return res.status(409).json({ success: false, message: "Payment is already completed." });
    if (["failed", "cancelled"].includes(payment.status)) return res.status(409).json({ success: false, message: "This payment cannot be approved." });

    const result = await applyVerifiedPayment({
      paymentId: payment._id,
      transactionId,
      verifiedAmount,
      verifiedProvider: payment.provider,
    });

    await audit(req, "payment.approve", "payment", payment._id, { transactionId, amount: verifiedAmount, provider: payment.provider });

    res.json({ success: true, message: "Payment approved and credits added.", payment: result.payment, user: result.user });
  } catch (error) {
    console.error("Admin approve payment error:", error);
    res.status(400).json({ success: false, message: error.message || "Could not approve payment." });
  }
});

router.post("/payments/:id/reject", async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["created", "pending"] }, creditsApplied: false },
      { $set: { status: "failed" } },
      { new: true }
    );

    if (!payment) return res.status(409).json({ success: false, message: "Payment not found or already processed." });

    await audit(req, "payment.reject", "payment", payment._id, { reason: String(req.body?.reason || "") });
    res.json({ success: true, message: "Payment rejected.", payment });
  } catch (error) {
    console.error("Admin reject payment error:", error);
    res.status(500).json({ success: false, message: "Could not reject payment." });
  }
});

router.get("/contacts", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const filter = {};
    if (["read", "unread"].includes(req.query.status)) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
    ]);

    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Admin contacts error:", error);
    res.status(500).json({ success: false, message: "Could not load contact messages." });
  }
});

router.patch("/contacts/:id", async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    if (!["read", "unread"].includes(status)) return res.status(400).json({ success: false, message: "Invalid message status." });
    const item = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Contact message not found." });
    await audit(req, "contact.status", "contact", item._id, { status });
    res.json({ success: true, item });
  } catch (error) {
    console.error("Admin contact update error:", error);
    res.status(500).json({ success: false, message: "Could not update message." });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    const item = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Contact message not found." });
    await audit(req, "contact.delete", "contact", item._id, { email: item.email, subject: item.subject });
    res.json({ success: true, message: "Contact message deleted." });
  } catch (error) {
    console.error("Admin contact delete error:", error);
    res.status(500).json({ success: false, message: "Could not delete message." });
  }
});

router.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const items = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, items });
  } catch (error) {
    console.error("Admin audit error:", error);
    res.status(500).json({ success: false, message: "Could not load audit logs." });
  }
});

router.post("/logout", async (req, res) => {
  await audit(req, "admin.logout");
  res.json({ success: true, message: "Logged out." });
});

module.exports = router;












