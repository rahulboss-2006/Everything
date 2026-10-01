const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const User = require("../models/User");

async function applyVerifiedPayment({
  paymentId,
  transactionId,
  verifiedAmount,
  verifiedProvider,
}) {
  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  if (!transactionId) {
    throw new Error("Transaction ID is required.");
  }

  if (!["bkash", "nagad"].includes(verifiedProvider)) {
    throw new Error("Invalid payment provider.");
  }

  const amount = Number(verifiedAmount);

  if (!Number.isFinite(amount) || amount < 10) {
    throw new Error("Invalid verified amount.");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: paymentId,
        provider: verifiedProvider,
        status: {
          $in: ["created", "pending"],
        },
        creditsApplied: false,
      }).session(session);

      if (!payment) {
        throw new Error(
          "Payment not found or already processed."
        );
      }

      if (Number(payment.amount) !== amount) {
        throw new Error(
          "Verified amount does not match payment amount."
        );
      }

      const duplicateTransaction =
        await Payment.findOne({
          transactionId,
          _id: {
            $ne: payment._id,
          },
        }).session(session);

      if (duplicateTransaction) {
        throw new Error(
          "Transaction has already been processed."
        );
      }

      const user = await User.findOneAndUpdate(
        {
          _id: payment.user,
          active: true,
        },
        {
          $inc: {
            credits: payment.credits,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!user) {
        throw new Error(
          "Active user account not found."
        );
      }

      payment.transactionId = transactionId;
      payment.status = "completed";
      payment.creditsApplied = true;

      await payment.save({
        session,
      });

      result = {
        payment,
        user,
      };
    });

    return {
      success: true,
      payment: result.payment,
      user: result.user,
    };
  } finally {
    await session.endSession();
  }
}

module.exports = {
  applyVerifiedPayment,
};