const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
      maxlength: 30,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    credits: {
      type: Number,
      default: 9999,
      min: 0,
    },

    googleId: {
      type: String,
      default: null,
    },

    facebookId: {
      type: String,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },

    accountStatus: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },

    deletedBy: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
