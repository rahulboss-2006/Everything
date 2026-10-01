const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    targetType: { type: String, default: "system", maxlength: 60 },
    targetId: { type: String, default: "", maxlength: 120 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
