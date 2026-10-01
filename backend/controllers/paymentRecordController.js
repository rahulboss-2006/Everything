const IncomingPaymentRecord = require("../models/IncomingPaymentRecord");

const {
  normalizePhone,
  normalizeTransactionId,
  reconcileIncomingPayment,
} = require("../services/paymentReconciliation");

function verifyReaderKey(req) {
  const configuredKey =
    process.env.PAYMENT_READER_API_KEY;

  if (!configuredKey) {
    return false;
  }

  const receivedKey =
    req.get("x-payment-reader-key");

  return (
    receivedKey &&
    receivedKey === configuredKey
  );
}

async function receivePaymentRecord(req, res) {
  try {
    if (!verifyReaderKey(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized payment reader.",
      });
    }

    const {
      provider,
      transactionId,
      senderPhone,
      receiverPhone,
      amount,
      receivedAt,
      sourceDeviceId,
      rawMessageHash,
    } = req.body;

    if (
      !["bkash", "nagad"].includes(provider)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment provider.",
      });
    }

    const normalizedTransactionId =
      normalizeTransactionId(transactionId);

    if (!normalizedTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required.",
      });
    }

    const normalizedSender =
      normalizePhone(senderPhone);

    const normalizedReceiver =
      normalizePhone(receiverPhone);

    if (!normalizedSender) {
      return res.status(400).json({
        success: false,
        message: "Sender phone number is required.",
      });
    }

    if (!normalizedReceiver) {
      return res.status(400).json({
        success: false,
        message: "Receiver phone number is required.",
      });
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount.",
      });
    }

    const paymentReceivedAt =
      receivedAt
        ? new Date(receivedAt)
        : new Date();

    if (
      Number.isNaN(
        paymentReceivedAt.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid receivedAt value.",
      });
    }

    /*
     * Never accept:
     *
     * userId
     * credits
     * status
     *
     * from the phone reader.
     *
     * The server decides these.
     */

    let record;

    try {
      record =
        await IncomingPaymentRecord.create({
          provider,

          transactionId:
            normalizedTransactionId,

          senderPhone:
            normalizedSender,

          receiverPhone:
            normalizedReceiver,

          amount: numericAmount,

          receivedAt:
            paymentReceivedAt,

          sourceDeviceId:
            sourceDeviceId
              ? String(sourceDeviceId).trim()
              : undefined,

          rawMessageHash:
            rawMessageHash
              ? String(rawMessageHash).trim()
              : undefined,

          consumed: false,
        });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          matched: false,
          duplicate: true,
          message:
            "This transaction has already been received.",
        });
      }

      throw error;
    }

    const reconciliation =
      await reconcileIncomingPayment(
        record._id
      );

    return res.status(201).json({
      success: true,

      recordId: record._id,

      matched:
        reconciliation.matched,

      message:
        reconciliation.matched
          ? "Payment matched and credits were applied."
          : reconciliation.reason,

      ...(reconciliation.matched
        ? {
            paymentId:
              reconciliation.payment._id,

            addedCredits:
              reconciliation.addedCredits,
          }
        : {}),
    });
  } catch (error) {
    console.error(
      "Receive payment record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not process payment record.",
    });
  }
}

module.exports = {
  receivePaymentRecord,
};
