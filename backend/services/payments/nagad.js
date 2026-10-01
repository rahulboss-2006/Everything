async function createPayment() {
  throw new Error(
    "Nagad gateway is not configured yet. Add the official Nagad API integration before processing real payments."
  );
}

async function verifyPayment() {
  throw new Error(
    "Nagad verification is not configured yet."
  );
}

module.exports = {
  createPayment,
  verifyPayment,
};