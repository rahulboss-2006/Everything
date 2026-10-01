const User = require("../models/User");
const Payment = require("../models/Payment");
const ContactMessage = require("../models/ContactMessage");
const AdminAuditLog = require("../models/AdminAuditLog");
const RefreshToken = require("../models/RefreshToken");
const EmailOTP = require("../models/EmailOTP");
const { sendAccountDeletionEmail } = require("../utils/email");
const { applyVerifiedPayment } = require("../services/paymentService");

async function getDashboard(req, res) {
  try {
    const [
      users,
      activeUsers,
      verifiedUsers,
      pendingPayments,
      completedPayments,
      failedPayments,
      revenue,
      unreadMessages,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        active: true,
      }),

      User.countDocuments({
        emailVerified: true,
      }),

      Payment.countDocuments({
        status: {
          $in: ["created", "pending"],
        },
      }),

      Payment.countDocuments({
        status: "completed",
      }),

      Payment.countDocuments({
        status: {
          $in: ["failed", "cancelled"],
        },
      }),

      Payment.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
            credits: {
              $sum: "$credits",
            },
          },
        },
      ]),

      ContactMessage.countDocuments({
        status: "unread",
      }),
    ]);

    const latestPayments = await Payment.find()
      .sort({
        createdAt: -1,
      })
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

    return res.status(500).json({
      success: false,
      message: "Could not load dashboard.",
    });
  }
}

async function getUsers(req, res) {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const search = String(
      req.query.search || ""
    ).trim();

    const filter = {};

    if (search) {
      filter.email = {
        $regex: search.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        $options: "i",
      };
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select(
          "email phone credits emailVerified active googleId facebookId createdAt updatedAt"
        )
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load users.",
    });
  }
}

async function getPayments(req, res) {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const status = String(
      req.query.status || ""
    ).trim();

    const provider = String(
      req.query.provider || ""
    ).trim();

    const filter = {};

    if (
      [
        "created",
        "pending",
        "completed",
        "failed",
        "cancelled",
      ].includes(status)
    ) {
      filter.status = status;
    }

    if (
      [
        "bkash",
        "nagad",
      ].includes(provider)
    ) {
      filter.provider = provider;
    }

    const [items, total] = await Promise.all([
      Payment.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(
          "user",
          "email credits active"
        )
        .lean(),

      Payment.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load payments.",
    });
  }
}

async function getContacts(req, res) {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const filter = {};

    if (
      ["read", "unread"].includes(
        req.query.status
      )
    ) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      ContactMessage.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin contacts error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load contact messages.",
    });
  }
}

async function getAuditLogs(req, res) {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      200
    );

    const items = await AdminAuditLog.find()
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Admin audit error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load audit logs.",
    });
  }
}

module.exports = {
  getDashboard,
  getUsers,
  getPayments,
  getContacts,
  getAuditLogs,
  updateUser,
  deleteUser,
  approvePayment,
  rejectPayment,
  updateContact,
  deleteContact,
  logout,
};
async function audit(req, action, targetType, targetId, details = {}) {
  try {
    await AdminAuditLog.create({
      adminEmail: req.admin?.email || "admin",
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      details,
    });
  } catch (error) {
    console.error("Admin audit write error:", error);
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { credits, active, emailVerified } = req.body || {};

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (credits !== undefined) {
      const nextCredits = Number(credits);

      if (!Number.isFinite(nextCredits) || nextCredits < 0) {
        return res.status(400).json({
          success: false,
          message: "Credits must be a valid non-negative number.",
        });
      }

      user.credits = nextCredits;
    }

    if (active !== undefined) {
      user.active = Boolean(active);
    }

    if (emailVerified !== undefined) {
      user.emailVerified = Boolean(emailVerified);
    }

    await user.save();

    await audit(req, "update_user", "user", user._id, {
      credits: user.credits,
      active: user.active,
      emailVerified: user.emailVerified,
    });

    return res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Admin update user error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update user.",
    });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();

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

    const email = user.email;

    try {
      await sendAccountDeletionEmail(email, reason);
    } catch (emailError) {
      console.error("Account deletion email error:", emailError);
    }

    await Promise.all([
      RefreshToken.deleteMany({ userId: user._id }),
      EmailOTP.deleteMany({ email }),
    ]);

    await User.deleteOne({ _id: user._id });

    await audit(req, "delete_user", "user", user._id, {
      email,
      reason,
    });

    return res.json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Admin delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete user.",
    });
  }
}

async function approvePayment(req, res) {
  try {
    const { id } = req.params;
    const { transactionId, amount } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required.",
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (!["created", "pending"].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be approved from status "${payment.status}".`,
      });
    }

    if (amount !== undefined) {
      const requestedAmount = Number(amount);

      if (
        !Number.isFinite(requestedAmount) ||
        requestedAmount !== Number(payment.amount)
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment amount does not match.",
        });
      }
    }

    const updatedPayment = await applyVerifiedPayment({
      paymentId: payment._id,
      transactionId: String(transactionId).trim(),
      provider: payment.provider,
    });

    await audit(req, "approve_payment", "payment", payment._id, {
      transactionId: String(transactionId).trim(),
    });

    return res.json({
      success: true,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Admin approve payment error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Could not approve payment.",
    });
  }
}

async function rejectPayment(req, res) {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim();

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (!["created", "pending"].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be rejected from status "${payment.status}".`,
      });
    }

    payment.status = "failed";

    if (reason) {
      payment.adminNote = reason;
    }

    await payment.save();

    await audit(req, "reject_payment", "payment", payment._id, {
      reason,
    });

    return res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Admin reject payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not reject payment.",
    });
  }
}

async function updateContact(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const contact = await ContactMessage.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    if (status !== undefined) {
      contact.status = status;
    }

    await contact.save();

    await audit(req, "update_contact", "contact", contact._id, {
      status: contact.status,
    });

    return res.json({
      success: true,
      item: contact,
    });
  } catch (error) {
    console.error("Admin update contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not update contact message.",
    });
  }
}

async function deleteContact(req, res) {
  try {
    const { id } = req.params;

    const contact = await ContactMessage.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found.",
      });
    }

    await ContactMessage.deleteOne({
      _id: contact._id,
    });

    await audit(req, "delete_contact", "contact", contact._id, {
      email: contact.email,
    });

    return res.json({
      success: true,
      message: "Contact message deleted successfully.",
    });
  } catch (error) {
    console.error("Admin delete contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete contact message.",
    });
  }
}

async function logout(req, res) {
  try {
    await audit(
      req,
      "admin_logout",
      "admin",
      req.admin?.email
    );

    return res.json({
      success: true,
      message: "Admin logged out.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not logout admin.",
    });
  }
}

module.exports = {
  getDashboard,
  getUsers,
  getPayments,
  getContacts,
  getAuditLogs,
  updateUser,
  deleteUser,
  approvePayment,
  rejectPayment,
  updateContact,
  deleteContact,
  logout,
};

async function deletePayment(req, res) {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    if (
      payment.user ||
      !["failed", "cancelled"].includes(payment.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Only orphaned failed/cancelled payments can be deleted.",
      });
    }

    await Payment.deleteOne({ _id: payment._id });

    await audit(
      req,
      "delete_payment",
      "payment",
      payment._id,
      {
        status: payment.status,
        amount: payment.amount,
        provider: payment.provider,
      }
    );

    return res.json({
      success: true,
      message: "Payment deleted successfully.",
    });
  } catch (error) {
    console.error("Admin delete payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete payment.",
    });
  }
}




