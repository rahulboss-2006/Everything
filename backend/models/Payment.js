const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    packageId: {
      type: String,
      default: "custom",
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 10,
    },

    credits: {
      type: Number,
      required: true,
      min: 0,
    },

    provider: {
      type: String,
      enum: ["bkash", "nagad"],
      required: true,
      index: true,
    },

    transactionId: {
      type: String,
      trim: true,
      uppercase: true,
    },

    payerPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    payerName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    receiverPhone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "created",
      
    },

    creditsApplied: {
      type: Boolean,
      default: false,
    },

    verificationSource: {
      type: String,
      enum: [
        "none",
        "sms_reader",
        "provider_api",
        "admin",
      ],
      default: "none",
    },

    verificationRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IncomingPaymentRecord",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Transaction IDs that have already been completed
 * must never be reused.
 *
 * Pending submissions are allowed to exist temporarily.
 */
paymentSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      status: "completed",
    },
  }
);

module.exports = mongoose.model("Payment", paymentSchema);




