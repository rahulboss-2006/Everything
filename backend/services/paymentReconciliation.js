const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const IncomingPaymentRecord = require("../models/IncomingPaymentRecord");
const User = require("../models/User");

function normalizePhone(value) {
  if (!value) return "";

  let phone = String(value)
    .trim()
    .replace(/[^\d+]/g, "");

  if (phone.startsWith("+880")) {
    phone = "0" + phone.slice(4);
  } else if (phone.startsWith("880")) {
    phone = "0" + phone.slice(3);
  }

  return phone;
}

function normalizeTransactionId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

async function reconcileIncomingPayment(recordId) {
  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      /*
       * Claim only an unconsumed incoming record.
       */
      const record =
        await IncomingPaymentRecord.findOne({
          _id: recordId,
          consumed: false,
        }).session(session);

      if (!record) {
        throw new Error(
          "Payment record not found or already consumed."
        );
      }

      const transactionId =
        normalizeTransactionId(
          record.transactionId
        );

      const senderPhone =
        normalizePhone(
          record.senderPhone
        );

      const receiverPhone =
        normalizePhone(
          record.receiverPhone
        );

      const receivedAmount =
        Number(record.amount);

      /*
       * Basic incoming record validation.
       */
      if (!transactionId) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              rejectionReason:
                "Transaction ID is missing.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "Transaction ID is missing.",
        };

        return;
      }

      if (
        !senderPhone ||
        !receiverPhone
      ) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              rejectionReason:
                "Sender or receiver number is missing.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "Sender or receiver number is missing.",
        };

        return;
      }

      if (
        !Number.isFinite(
          receivedAmount
        ) ||
        receivedAmount < 10
      ) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              rejectionReason:
                "Invalid payment amount.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "Invalid payment amount.",
        };

        return;
      }

      /*
       * -------------------------------------------------------
       * IMPORTANT:
       * Find the user's pending payment WITHOUT trusting
       * any Transaction ID supplied by the website user.
       *
       * The Transaction ID comes from the real phone record.
       * -------------------------------------------------------
       */
      const pendingPayments =
        await Payment.find({
          provider: record.provider,
          status: "pending",
          creditsApplied: false,
        })
          .sort({ createdAt: 1 })
          .session(session);

      let payment = null;

      /*
       * Match all important payment attributes.
       */
      for (
        const candidate of pendingPayments
      ) {
        const candidatePayer =
          normalizePhone(
            candidate.payerPhone
          );

        const candidateReceiver =
          normalizePhone(
            candidate.receiverPhone
          );

        const candidateAmount =
          Number(candidate.amount);

        if (
          candidatePayer ===
            senderPhone &&
          candidateReceiver ===
            receiverPhone &&
          candidateAmount ===
            receivedAmount
        ) {
          payment = candidate;
          break;
        }
      }

      /*
       * No exact pending payment.
       * Never add credits.
       */
      if (!payment) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              rejectionReason:
                "No exact matching pending payment found.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "No exact matching pending payment found.",
        };

        return;
      }

      /*
       * -------------------------------------------------------
       * Verify the actual User phone as an additional layer.
       * -------------------------------------------------------
       */
      const user =
        await User.findOne({
          _id: payment.user,
          active: true,
          accountStatus: "active",
        }).session(session);

      if (!user) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              rejectionReason:
                "Active user account not found.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "Active user account not found.",
        };

        return;
      }

      /*
       * User.phone must match the real SMS sender.
       */
      const userPhone =
        normalizePhone(user.phone);

      if (
        !userPhone ||
        userPhone !== senderPhone
      ) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "rejected",
              matchedUser: user._id,
              rejectionReason:
                "SMS sender does not match the user's registered phone number.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "SMS sender does not match the user's registered phone number.",
        };

        return;
      }

      /*
       * -------------------------------------------------------
       * Claim the payment atomically.
       * This prevents two requests from crediting the same
       * payment at the same time.
       * -------------------------------------------------------
       */
      const claimedPayment =
        await Payment.findOneAndUpdate(
          {
            _id: payment._id,
            status: "pending",
            creditsApplied: false,
          },
          {
            $set: {
              transactionId:
                transactionId,

              status:
                "completed",

              creditsApplied:
                true,

              verificationSource:
                "sms_reader",

              verificationRecord:
                record._id,

              verifiedAt:
                new Date(),
            },
          },
          {
            new: true,
            session,
          }
        );

      if (!claimedPayment) {
        await IncomingPaymentRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              status: "duplicate",
              rejectionReason:
                "Payment was already processed.",
              processedAt: new Date(),
            },
          },
          { session }
        );

        result = {
          matched: false,
          reason:
            "Payment was already processed.",
        };

        return;
      }

      /*
       * -------------------------------------------------------
       * Add credits atomically.
       * -------------------------------------------------------
       */
      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id: user._id,
            active: true,
            accountStatus: "active",
          },
          {
            $inc: {
              credits:
                claimedPayment.credits,
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          }
        );

      if (!updatedUser) {
        throw new Error(
          "User account could not be updated."
        );
      }

      /*
       * -------------------------------------------------------
       * Mark incoming record as successfully consumed.
       * -------------------------------------------------------
       */
      await IncomingPaymentRecord.updateOne(
        {
          _id: record._id,
          consumed: false,
        },
        {
          $set: {
            consumed: true,
            matchedPayment:
              claimedPayment._id,
            matchedUser:
              updatedUser._id,
            status: "credited",
            creditsAdded:
              claimedPayment.credits,
            processedAt: new Date(),
            rejectionReason: "",
          },
        },
        { session }
      );

      result = {
        matched: true,
        payment:
          claimedPayment,
        user:
          updatedUser,
        addedCredits:
          claimedPayment.credits,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  normalizePhone,
  normalizeTransactionId,
  reconcileIncomingPayment,
};
