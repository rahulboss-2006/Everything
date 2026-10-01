const express = require("express");

const {
  receivePaymentRecord,
} = require("../controllers/paymentRecordController");

const router = express.Router();

/*
 * This endpoint is NOT protected by normal user JWT.
 *
 * The phone/SMS reader uses:
 *
 * x-payment-reader-key
 *
 * Never expose this key in the frontend.
 */

router.post(
  "/",
  receivePaymentRecord
);

module.exports = router;
