const express = require("express");

const {
  getPackages,
  createPayment,
  getPaymentStatus,
  verifyPayment,
} = require("../controllers/rechargeController");

const protect = require("../middleware/auth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Recharge Packages
|--------------------------------------------------------------------------
*/

router.get(
  "/packages",
  protect,
  getPackages
);

/*
|--------------------------------------------------------------------------
| Create Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/create",
  protect,
  createPayment
);

/*
|--------------------------------------------------------------------------
| Payment Status
|--------------------------------------------------------------------------
*/

router.get(
  "/payment/:paymentId",
  protect,
  getPaymentStatus
);


/*
|--------------------------------------------------------------------------
| Verify Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/payment/:paymentId/verify",
  protect,
  verifyPayment
);

module.exports = router;

