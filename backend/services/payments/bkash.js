async function createPayment() {
  throw new Error(
    "bKash gateway is not configured yet. Add the official bKash API integration before processing real payments."
  );
}

async function verifyPayment() {
  throw new Error(
    "bKash verification is not configured yet."
  );
}

module.exports = {
  createPayment,
  verifyPayment,
};