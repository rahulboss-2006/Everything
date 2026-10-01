const Payment = require("../models/Payment");
const User = require("../models/User");

const CREDIT_RATE = 2;

const PACKAGES = {
  starter: {
    name: "Starter",
    amount: 10,
    credits: 20,
  },

  standard: {
    name: "Standard",
    amount: 50,
    credits: 100,
  },

  pro: {
    name: "Pro",
    amount: 100,
    credits: 200,
  },
};

function calculateCredits(amount) {
  return Math.floor(Number(amount) * CREDIT_RATE);
}

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

/*
|--------------------------------------------------------------------------
| GET PACKAGES
|--------------------------------------------------------------------------
*/

async function getPackages(req, res) {
  return res.json({
    success: true,

    creditRate: CREDIT_RATE,

    packages: PACKAGES,

    paymentNumbers: {
      bkash:
        process.env.BKASH_RECEIVER_NUMBER || "",

      nagad:
        process.env.NAGAD_RECEIVER_NUMBER || "",
    },

    message: "৳1 = 2 credits",
  });
}

/*
|--------------------------------------------------------------------------
| CREATE / SUBMIT PAYMENT
|--------------------------------------------------------------------------
|
| This endpoint now creates the actual pending recharge submission.
|
| NO credits are added here.
|
| Required:
|
| provider
| packageId OR amount
| transactionId
| payerPhone
| payerName
|
|--------------------------------------------------------------------------
*/

async function createPayment(req, res) {
  try {
    const {
      packageId,
      amount,
      provider,
      transactionId,
      payerPhone,
      payerName,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | PROVIDER
    |--------------------------------------------------------------------------
    */

    if (!["bkash", "nagad"].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment provider.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | PAYER PHONE
    |--------------------------------------------------------------------------
    | Optional during initial payment creation.
    | User can provide it later during payment verification.
    */

    const normalizedPayerPhone = payerPhone
      ? normalizePhone(payerPhone)
      : "";

    if (
      normalizedPayerPhone &&
      !/^01\d{9}$/.test(normalizedPayerPhone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid Bangladesh mobile number.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    const cleanPayerName =
      String(payerName || "").trim();


    if (cleanPayerName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name is too long.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | AMOUNT
    |--------------------------------------------------------------------------
    */

    let paymentAmount;
    let selectedPackage = null;

    if (packageId) {
      selectedPackage = PACKAGES[packageId];

      if (!selectedPackage) {
        return res.status(400).json({
          success: false,
          message: "Invalid recharge package.",
        });
      }

      paymentAmount = selectedPackage.amount;
    } else if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment amount.",
        });
      }

      if (numericAmount < 10) {
        return res.status(400).json({
          success: false,
          message:
            "Minimum recharge amount is ৳10.",
        });
      }

      if (
        Math.round(numericAmount * 100) !==
        numericAmount * 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Amount can have maximum 2 decimal places.",
        });
      }

      paymentAmount = numericAmount;
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Package or payment amount is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SERVER-SIDE CREDIT CALCULATION
    |--------------------------------------------------------------------------
    */

    const expectedCredits =
      calculateCredits(paymentAmount);

    /*
    |--------------------------------------------------------------------------
    | RECEIVER NUMBER
    |--------------------------------------------------------------------------
    */

    const receiverPhone =
      provider === "bkash"
        ? normalizePhone(
            process.env.BKASH_RECEIVER_NUMBER
          )
        : normalizePhone(
            process.env.NAGAD_RECEIVER_NUMBER
          );

    if (!receiverPhone) {
      console.error(
        `${provider.toUpperCase()} receiver number is not configured.`
      );

      return res.status(503).json({
        success: false,
        message:
          "Payment receiving account is not configured.",
      });
    }


    /*
    |--------------------------------------------------------------------------
    | CREATE PENDING PAYMENT
    |--------------------------------------------------------------------------
    */

    const payment = await Payment.create({
      user: req.user._id,

      packageId:
        selectedPackage
          ? packageId
          : "custom",

      amount: paymentAmount,

      credits: expectedCredits,

      provider,


      payerPhone:
        normalizedPayerPhone,

      payerName:
        cleanPayerName,

      receiverPhone,

      status: "pending",

      creditsApplied: false,

      verificationSource: "none",
    });

    return res.status(201).json({
      success: true,

      message:
        "Payment submitted successfully. Verification is pending.",

      payment: {
        id: payment._id,

        packageId:
          payment.packageId,

        amount:
          payment.amount,

        expectedCredits:
          payment.credits,

        provider:
          payment.provider,

        transactionId:
          payment.transactionId,

        payerPhone:
          payment.payerPhone,

        payerName:
          payment.payerName,

        receiverPhone:
          payment.receiverPhone,

        status:
          payment.status,

        creditsApplied:
          payment.creditsApplied,

        verificationSource:
          payment.verificationSource,
      },
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | DUPLICATE TRANSACTION RACE CONDITION
    |--------------------------------------------------------------------------
    */

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This Transaction ID has already been processed.",
      });
    }

    console.error(
      "Create payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not submit payment.",
    });
  }
}


/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

async function verifyPayment(req, res) {
  try {
    const { paymentId } = req.params;

    const transactionId = String(
      req.body?.transactionId || ""
    )
      .trim()
      .toUpperCase();

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message: "Payment ID is required.",
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message: "Transaction ID is required.",
      });
    }

    if (
      transactionId.length < 4 ||
      transactionId.length > 100
    ) {
      return res.status(400).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message: "Invalid Transaction ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | FIND PAYMENT
    |--------------------------------------------------------------------------
    */

    const payment = await Payment.findOne({
      _id: paymentId,
      user: req.user._id,
    }).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message: "Payment not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS CHECK
    |--------------------------------------------------------------------------
    */

    if (
      payment.status === "completed" ||
      payment.creditsApplied
    ) {
      return res.status(409).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message:
          "This payment has already been completed.",
      });
    }

    if (
      ["failed", "cancelled"].includes(
        payment.status
      )
    ) {
      return res.status(409).json({
        success: false,
        verified: false,
        creditsAdded: false,
        message:
          "This payment cannot be verified.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT SECURITY BLOCK
    |--------------------------------------------------------------------------
    |
    | bKash/Nagad real gateway verification is not
    | configured yet.
    |
    | NEVER trust a user-entered Transaction ID.
    |
    */

    console.warn(
      "PAYMENT VERIFICATION BLOCKED:",
      {
        paymentId: String(payment._id),
        userId: String(req.user._id),
        provider: payment.provider,
        amount: payment.amount,
        transactionId,
      }
    );

    return res.status(503).json({
      success: false,
      verified: false,
      creditsAdded: false,
      status: "verification_unavailable",
      message:
        "Payment verification is currently unavailable. The Transaction ID could not be verified, so no credits were added.",
    });
  } catch (error) {
    console.error(
      "Verify payment error:",
      error
    );

    return res.status(400).json({
      success: false,
      verified: false,
      creditsAdded: false,
      message:
        error.message ||
        "Could not verify payment.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET PAYMENT STATUS
|--------------------------------------------------------------------------
*/

async function getPaymentStatus(req, res) {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required.",
      });
    }

    const payment =
      await Payment.findOne({
        _id: paymentId,
        user: req.user._id,
      }).select(
        "_id packageId amount credits provider status creditsApplied transactionId payerPhone payerName receiverPhone verificationSource verifiedAt createdAt updatedAt"
      );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    return res.json({
      success: true,

      payment: {
        id: payment._id,

        packageId:
          payment.packageId,

        amount:
          payment.amount,

        credits:
          payment.credits,

        provider:
          payment.provider,

        status:
          payment.status,

        creditsApplied:
          payment.creditsApplied,

        transactionId:
          payment.transactionId,

        payerPhone:
          payment.payerPhone,

        payerName:
          payment.payerName,

        receiverPhone:
          payment.receiverPhone,

        verificationSource:
          payment.verificationSource,

        verifiedAt:
          payment.verifiedAt,

        createdAt:
          payment.createdAt,

        updatedAt:
          payment.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Get payment status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Could not get payment status.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| APPLY PAYMENT CREDITS
|--------------------------------------------------------------------------
|
| Legacy trusted server-side function.
|
| SMS reconciliation now performs its own atomic
| credit application.
|
|--------------------------------------------------------------------------
*/

async function applyPaymentCredits(paymentId) {
  const payment =
    await Payment.findOne({
      _id: paymentId,
      status: "completed",
      creditsApplied: false,
    });

  if (!payment) {
    return {
      applied: false,
      reason:
        "Payment not ready or credits already applied.",
    };
  }

  const claimedPayment =
    await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        status: "completed",
        creditsApplied: false,
      },
      {
        $set: {
          creditsApplied: true,
        },
      },
      {
        new: true,
      }
    );

  if (!claimedPayment) {
    return {
      applied: false,
      reason:
        "Payment credits were already claimed.",
    };
  }

  const user =
    await User.findByIdAndUpdate(
      payment.user,
      {
        $inc: {
          credits: payment.credits,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!user) {
    await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        creditsApplied: true,
      },
      {
        $set: {
          creditsApplied: false,
        },
      }
    );

    throw new Error(
      "User not found while applying payment credits."
    );
  }

  return {
    applied: true,

    paymentId:
      payment._id,

    addedCredits:
      payment.credits,

    totalCredits:
      user.credits,
  };
}

module.exports = {
  CREDIT_RATE,
  PACKAGES,
  calculateCredits,

  normalizePhone,
  normalizeTransactionId,

  getPackages,
  createPayment,
  getPaymentStatus,
  verifyPayment,

  applyPaymentCredits,
};







