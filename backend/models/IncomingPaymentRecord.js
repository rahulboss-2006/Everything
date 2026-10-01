const mongoose = require("mongoose");

const incomingPaymentRecordSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["bkash", "nagad"],
      required: true,
      index: true,
    },

    transactionId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    senderPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    receiverPhone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },

    sourceDeviceId: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },

    rawMessageHash: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },

    matchedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    matchedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    consumed: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "received",
        "matched",
        "credited",
        "rejected",
        "duplicate",
      ],
      default: "received",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    creditsAdded: {
      type: Number,
      default: 0,
      min: 0,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One provider transaction can only be received once.
 */
incomingPaymentRecordSchema.index(
  {
    provider: 1,
    transactionId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "IncomingPaymentRecord",
  incomingPaymentRecordSchema
);
