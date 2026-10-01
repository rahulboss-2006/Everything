import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    price: 10,
    credits: 20,
  },
  {
    id: "standard",
    name: "Standard",
    price: 50,
    credits: 100,
  },
  {
    id: "pro",
    name: "Pro",
    price: 100,
    credits: 200,
  },
];

const PAYMENT_METHODS = [
  {
    id: "bkash",
    name: "bKash",
  },
  {
    id: "nagad",
    name: "Nagad",
  },
];

export default function Recharge() {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [mode, setMode] = useState("package");

  const [selectedPackage, setSelectedPackage] =
    useState(null);

  const [customAmount, setCustomAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("bkash");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * Payment flow:
   *
   * select
   * payment
   * success
   */
  const [paymentStep, setPaymentStep] =
    useState("select");

  /*
   * Created payment returned by backend.
   */
  const [createdPayment, setCreatedPayment] =
    useState(null);

  /*
   * Transaction ID entered by user.
   */
  const [transactionId, setTransactionId] =
    useState("");

  /*
   * Redirect to login if user is not authenticated.
   */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  /*
   * Find selected package.
   */
  const selectedPackageData = useMemo(() => {
    return PACKAGES.find(
      (pkg) => pkg.id === selectedPackage
    );
  }, [selectedPackage]);

  /*
   * Calculate custom credits.
   *
   * ৳1 = 2 credits
   */
  const customCredits = useMemo(() => {
    const amount = Number(customAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return 0;
    }

    return Math.floor(amount * 2);
  }, [customAmount]);

  /*
   * Select package.
   */
  function handlePackageSelect(pkg) {
    if (paymentStep !== "select") {
      return;
    }

    setMode("package");
    setSelectedPackage(pkg.id);
    setCustomAmount("");
    setMessage("");
    setError("");
  }

  /*
   * Select custom amount.
   */
  function handleCustomMode() {
    if (paymentStep !== "select") {
      return;
    }

    setMode("custom");
    setSelectedPackage(null);
    setMessage("");
    setError("");
  }

  /*
   * Custom amount input.
   */
  function handleCustomAmountChange(event) {
    if (paymentStep !== "select") {
      return;
    }

    const value = event.target.value;

    /*
     * Only allow:
     *
     * 10
     * 20
     * 10.5
     * 10.50
     *
     * Maximum 2 decimal places.
     */
    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    setCustomAmount(value);
    setMessage("");
    setError("");
  }

  /*
   * Select payment method.
   */
  function handlePaymentMethodChange(methodId) {
    if (paymentStep !== "select") {
      return;
    }

    setPaymentMethod(methodId);
    setMessage("");
    setError("");
  }

  /*
   * Create payment.
   */
  async function handleRecharge() {
    setMessage("");
    setError("");

    let requestBody;

    /*
     * PACKAGE PAYMENT
     */
    if (mode === "package") {
      if (!selectedPackageData) {
        setError(
          "Please select a package."
        );

        return;
      }

      requestBody = {
        packageId:
          selectedPackageData.id,

        provider:
          paymentMethod,
      };
    }

    /*
     * CUSTOM PAYMENT
     */
    else {
      const amount =
        Number(customAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setError(
          "Please enter a valid amount."
        );

        return;
      }

      if (amount < 10) {
        setError(
          "Minimum recharge amount is ৳10."
        );

        return;
      }

      /*
       * Maximum 2 decimal places.
       */
      if (
        Math.round(amount * 100) !==
        amount * 100
      ) {
        setError(
          "Amount can have maximum 2 decimal places."
        );

        return;
      }

      requestBody = {
        amount,

        provider:
          paymentMethod,
      };
    }

    try {
      setLoading(true);

      /*
       * Get access token.
       */
      const token =
        localStorage.getItem(
          "accessToken"
        );

      if (!token) {
        navigate("/login");
        return;
      }

      /*
       * Create payment on backend.
       */
      const response =
        await fetch(
          `${API_BASE_URL}/recharge/create`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      let data = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      /*
       * Handle backend error.
       */
      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Could not create payment."
        );
      }

      /*
       * Save created payment.
       */
      setCreatedPayment(
        data.payment
      );

      /*
       * Clear previous transaction ID.
       */
      setTransactionId("");

      /*
       * Move to payment instructions.
       */
      setPaymentStep("payment");

      setMessage("");

      setError("");

      console.log(
        "Payment created:",
        data.payment
      );
    } catch (err) {
      console.error(
        "RECHARGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Could not create payment."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Transaction ID input.
   */
  function handleTransactionIdChange(event) {
    const value =
      event.target.value
        .toUpperCase()
        .replace(/\s+/g, "");

    setTransactionId(value);
    setMessage("");
    setError("");
  }

  /*
   * Verify payment.
   */
  async function handleVerifyPayment() {
  setMessage("");
  setError("");

  /*
   * Backend may return either:
   * id or _id
   */
  const paymentId =
    createdPayment?.id ||
    createdPayment?._id;

  if (!paymentId) {
    setError(
      "Payment information is missing."
    );

    console.error(
      "VERIFY PAYMENT: Missing payment ID",
      createdPayment
    );

    return;
  }

  const cleanTransactionId =
    transactionId.trim().toUpperCase();

  if (!cleanTransactionId) {
    setError(
      "Please enter your Transaction ID."
    );

    return;
  }

  if (
    cleanTransactionId.length < 4
  ) {
    setError(
      "Please enter a valid Transaction ID."
    );

    return;
  }

  try {
    setLoading(true);

    const token =
      localStorage.getItem(
        "accessToken"
      );

    if (!token) {
      navigate("/login");
      return;
    }

    /*
     * Verify payment.
     */
    const verifyUrl =
      `${API_BASE_URL}/recharge/payment/${paymentId}/verify`;

    console.log(
      "VERIFY PAYMENT URL:",
      verifyUrl
    );

    const response =
      await fetch(
        verifyUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body:
            JSON.stringify({
              transactionId:
                cleanTransactionId,
            }),
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch {
      data = {};
    }

    console.log(
      "VERIFY PAYMENT RESPONSE:",
      response.status,
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.message ||
          `Could not verify payment. Server returned ${response.status}.`
      );
    }

    /*
     * Payment completed.
     */
    setCreatedPayment(
      data.payment
    );

    setPaymentStep("success");

    setTransactionId("");

    setMessage(
      data.message ||
        "Payment verified and credits added successfully."
    );

    setError("");

    /*
     * Refresh user balance.
     */
    setTimeout(() => {
      window.location.reload();
    }, 1200);

  } catch (err) {
    console.error(
      "VERIFY PAYMENT ERROR:",
      err
    );

    setError(
      err?.message ||
        "Could not verify payment."
    );

  } finally {
    setLoading(false);
  }
}

  /*
   * Go back from payment screen.
   */
  function handleBackToSelection() {
    if (loading) {
      return;
    }

    setPaymentStep("select");
    setCreatedPayment(null);
    setTransactionId("");
    setMessage("");
    setError("");
  }

  /*
   * Auth loading screen.
   */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm opacity-70">
          Loading...
        </p>
      </div>
    );
  }

  /*
   * Not authenticated.
   */
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ========================================
            TOP BAR
        ======================================== */}

        <div className="flex items-center justify-between">

          {/* Back button */}

          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back to Home"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 4.158a.75.75 0 1 1-1.06 1.061l-5.5-5.5a.75.75 0 0 1 0-1.061l5.5-5.5a.75.75 0 0 1 1.06 1.06L5.611 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>

            <span>
              Back to Home
            </span>
          </button>

          {/* Theme toggle */}

          <ThemeToggle />

        </div>

        {/* ========================================
            HEADER
        ======================================== */}

        <div className="pt-10 text-center">

          <h1 className="text-3xl font-bold sm:text-4xl">
            Recharge Credits
          </h1>

          <p className="mt-3 opacity-70">
            Current balance:{" "}
            <strong>
              {user.credits ?? 0}
            </strong>{" "}
            credits
          </p>

          <div className="mx-auto mt-3 inline-flex rounded-full border px-4 py-2 text-sm">
            ৳1 = 2 credits
          </div>

        </div>

        {/* ========================================
            PAYMENT SELECTION
        ======================================== */}

        {paymentStep === "select" && (
          <>
            {/* ========================================
                MODE SELECTOR
            ======================================== */}

            <div className="mx-auto mt-8 flex max-w-md rounded-2xl border p-1">

              <button
                type="button"
                onClick={() => {
                  setMode("package");
                  setMessage("");
                  setError("");
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === "package"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                Packages
              </button>

              <button
                type="button"
                onClick={
                  handleCustomMode
                }
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === "custom"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                Custom Amount
              </button>

            </div>

            {/* ========================================
                PACKAGE SECTION
            ======================================== */}

            {mode === "package" && (

              <div className="mt-8 grid gap-5 md:grid-cols-3">

                {PACKAGES.map((pkg) => {

                  const isSelected =
                    selectedPackage ===
                    pkg.id;

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() =>
                        handlePackageSelect(
                          pkg
                        )
                      }
                      className={`relative rounded-2xl border p-6 text-left transition ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-500"
                          : "hover:border-gray-400"
                      }`}
                    >

                      {isSelected && (
                        <div className="absolute right-4 top-4 rounded-full px-2 py-1 text-xs font-semibold">
                          ✓
                        </div>
                      )}

                      <h2 className="text-xl font-bold">
                        {pkg.name}
                      </h2>

                      <p className="mt-5 text-3xl font-bold">
                        ৳{pkg.price}
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {pkg.credits} credits
                      </p>

                      <p className="mt-2 text-sm opacity-60">
                        ৳1 = 2 credits
                      </p>

                      <p className="mt-5 text-sm opacity-60">
                        Select this package
                      </p>

                    </button>
                  );
                })}

              </div>
            )}

            {/* ========================================
                CUSTOM AMOUNT SECTION
            ======================================== */}

            {mode === "custom" && (

              <div className="mx-auto mt-8 max-w-xl rounded-2xl border p-6">

                <h2 className="text-xl font-bold">
                  Custom Recharge
                </h2>

                <p className="mt-2 text-sm opacity-60">
                  Choose your own recharge amount.
                </p>

                <label className="mt-6 block text-sm font-semibold">
                  Amount
                </label>

                <div className="mt-2 flex items-center rounded-xl border px-4">

                  <span className="mr-2 text-lg font-semibold">
                    ৳
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={
                      handleCustomAmountChange
                    }
                    placeholder="10"
                    className="w-full border-0 bg-transparent py-4 text-lg !outline-none focus:!border-0 focus:!outline-none"
                  />

                </div>

                <div className="mt-5 rounded-xl border p-5">

                  <p className="text-sm opacity-60">
                    You will receive
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {customCredits}
                  </p>

                  <p className="mt-1 text-sm opacity-60">
                    credits
                  </p>

                </div>

                <p className="mt-4 text-xs opacity-60">
                  Minimum amount: ৳10
                </p>

                <p className="mt-1 text-xs opacity-60">
                  Credit rate: ৳1 = 2 credits
                </p>

              </div>
            )}

            {/* ========================================
                PAYMENT METHOD
            ======================================== */}

            <div className="mx-auto mt-8 max-w-xl">

              <h2 className="text-lg font-bold">
                Payment Method
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3">

                {PAYMENT_METHODS.map(
                  (method) => {

                    const isSelected =
                      paymentMethod ===
                      method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() =>
                          handlePaymentMethodChange(
                            method.id
                          )
                        }
                        className={`rounded-xl border p-4 text-sm font-semibold transition ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500"
                            : "hover:border-gray-400"
                        }`}
                      >

                        {method.name}

                        {isSelected && (
                          <span className="ml-2">
                            ✓
                          </span>
                        )}

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* ========================================
                ERROR MESSAGE
            ======================================== */}

            {error && (

              <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-600">

                {error}

              </div>
            )}

            {/* ========================================
                STATUS MESSAGE
            ======================================== */}

            {message && (

              <div className="mx-auto mt-6 max-w-xl rounded-xl border border-green-500/40 px-4 py-3 text-sm text-green-600">

                {message}

              </div>
            )}

            {/* ========================================
                PAYMENT BUTTON
            ======================================== */}

            <div className="mx-auto mt-8 max-w-xl">

              <button
                type="button"
                onClick={
                  handleRecharge
                }
                disabled={loading}
                className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
              >

                {loading
                  ? "Creating Payment..."
                  : mode === "package" &&
                    selectedPackageData
                  ? `Pay ৳${selectedPackageData.price}`
                  : mode === "custom" &&
                    customAmount
                  ? `Pay ৳${customAmount}`
                  : "Continue to Payment"}

              </button>

            </div>

            <p className="mx-auto mt-5 max-w-xl text-center text-xs opacity-50">
              Credits are added only after payment
              verification is completed by the server.
            </p>
          </>
        )}

        {/* ========================================
            PAYMENT INSTRUCTIONS
        ======================================== */}

        {paymentStep === "payment" && createdPayment && (

          <div className="mx-auto mt-8 max-w-xl">

            <div className="rounded-2xl border p-6">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm opacity-60">
                    Payment Method
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {createdPayment.provider === "bkash"
                      ? "bKash"
                      : "Nagad"}
                  </h2>
                </div>

                <div className="rounded-full border px-3 py-1 text-xs font-semibold">
                  Pending
                </div>

              </div>

              {/* Amount */}

              <div className="mt-6 rounded-xl border p-5">

                <p className="text-sm opacity-60">
                  Amount
                </p>

                <p className="mt-1 text-3xl font-bold">
                  ৳{createdPayment.amount}
                </p>

                <p className="mt-1 text-sm opacity-60">
                  You will receive{" "}
                  {createdPayment.credits} credits
                </p>

              </div>

              {/* Receiver */}

              {createdPayment.receiverPhone && (

                <div className="mt-5 rounded-xl border p-5">

                  <p className="text-sm opacity-60">
                    Send payment to this number
                  </p>

                  <p className="mt-2 text-xl font-bold tracking-wide">
                    {createdPayment.receiverPhone}
                  </p>

                  <p className="mt-2 text-xs opacity-60">
                    Open your{" "}
                    {createdPayment.provider === "bkash"
                      ? "bKash"
                      : "Nagad"}{" "}
                    app and complete the payment.
                  </p>

                </div>
              )}

              {/* Instructions */}

              <div className="mt-5 rounded-xl border p-5">

                <p className="font-semibold">
                  Payment Steps
                </p>

                <ol className="mt-3 space-y-2 text-sm opacity-70">

                  <li>
                    1. Open{" "}
                    {createdPayment.provider === "bkash"
                      ? "bKash"
                      : "Nagad"}.
                  </li>

                  <li>
                    2. Send ৳{createdPayment.amount}{" "}
                    to the receiver number above.
                  </li>

                  <li>
                    3. Complete the payment.
                  </li>

                  <li>
                    4. Copy the Transaction ID.
                  </li>

                  <li>
                    5. Enter the Transaction ID below.
                  </li>

                </ol>

              </div>

              {/* Transaction ID */}

              <div className="mt-6">

                <label className="block text-sm font-semibold">
                  Transaction ID
                </label>

                <input
                  type="text"
                  value={transactionId}
                  onChange={
                    handleTransactionIdChange
                  }
                  placeholder="Enter Transaction ID"
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-2 w-full rounded-xl border bg-transparent px-4 py-4 text-base uppercase !outline-none focus:!border-blue-500"
                />

              </div>

              {/* Error */}

              {error && (

                <div className="mt-5 rounded-xl border border-red-500/40 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>

              )}

              {/* Verify */}

              <button
                type="button"
                onClick={
                  handleVerifyPayment
                }
                disabled={
                  loading ||
                  !transactionId.trim()
                }
                className="mt-6 w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
              >

                {loading
                  ? "Verifying Payment..."
                  : "Verify Payment"}

              </button>

              {/* Back */}

              <button
                type="button"
                onClick={
                  handleBackToSelection
                }
                disabled={loading}
                className="mt-3 w-full rounded-xl border px-6 py-4 text-sm font-semibold transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>

            </div>

            <p className="mt-5 text-center text-xs opacity-50">
              Do not close this page until your
              Transaction ID has been submitted.
            </p>

          </div>
        )}

        {/* ========================================
            PAYMENT SUCCESS
        ======================================== */}

        {paymentStep === "success" && (

          <div className="mx-auto mt-10 max-w-xl">

            <div className="rounded-2xl border p-8 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-500/40 text-3xl text-green-600">
                ✓
              </div>

              <h2 className="mt-5 text-2xl font-bold">
                Payment Successful
              </h2>

              <p className="mt-3 text-sm opacity-70">
                Your payment has been verified
                and your credits have been added.
              </p>

              {createdPayment && (

                <div className="mt-6 rounded-xl border p-5">

                  <p className="text-sm opacity-60">
                    Credits Added
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    +{createdPayment.credits}
                  </p>

                  <p className="mt-1 text-sm opacity-60">
                    credits
                  </p>

                </div>
              )}

              {message && (

                <div className="mt-5 rounded-xl border border-green-500/40 px-4 py-3 text-sm text-green-600">
                  {message}
                </div>

              )}

              <p className="mt-5 text-xs opacity-50">
                Updating your account balance...
              </p>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
