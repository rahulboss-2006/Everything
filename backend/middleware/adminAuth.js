const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication is required.",
      });
    }

    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    if (decoded?.type !== "admin" || !decoded?.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token.",
      });
    }

    req.admin = {
      email: decoded.email,
      type: decoded.type,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token.",
    });
  }
}

module.exports = requireAdmin;
