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
   * Redirect to login if user is not authenticated.
   */

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.hash = "#/login";
    }
  }, [authLoading, user]);


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
   * à§³1 = 2 credits
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
    setMode("custom");

    setSelectedPackage(null);

    setMessage("");

    setError("");
  }


  /*
   * Custom amount input.
   */

  function handleCustomAmountChange(event) {
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
          "Minimum recharge amount is à§³10."
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
        window.location.hash = "#/login";

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
       * IMPORTANT:
       *
       * Do NOT update credits here.
       *
       * Payment is only created.
       *
       * Credits must be added after
       * real gateway verification.
       */

      setMessage(
        "Payment request created. Awaiting payment gateway."
      );


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
            onClick={() => {
              window.location.hash = "#/";
            }}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            <span className="text-lg">
              â†
            </span>

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
            à§³1 = 2 credits
          </div>

        </div>


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

                  {/* Selected */}

                  {isSelected && (
                    <div className="absolute right-4 top-4 rounded-full px-2 py-1 text-xs font-semibold">
                      âœ“
                    </div>
                  )}


                  <h2 className="text-xl font-bold">
                    {pkg.name}
                  </h2>


                  <p className="mt-5 text-3xl font-bold">
                    à§³{pkg.price}
                  </p>


                  <p className="mt-2 text-lg font-semibold">
                    {pkg.credits} credits
                  </p>


                  <p className="mt-2 text-sm opacity-60">
                    à§³1 = 2 credits
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
                à§³
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


            {/* Credit preview */}

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
              Minimum amount: à§³10
            </p>


            <p className="mt-1 text-xs opacity-60">
              Credit rate: à§³1 = 2 credits
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
                    onClick={() => {
                      setPaymentMethod(
                        method.id
                      );

                      setMessage("");

                      setError("");
                    }}
                    className={`rounded-xl border p-4 text-sm font-semibold transition ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500"
                        : "hover:border-gray-400"
                    }`}
                  >

                    {method.name}

                    {isSelected && (
                      <span className="ml-2">
                        âœ“
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
              ? `Pay à§³${selectedPackageData.price}`
              : mode === "custom" &&
                customAmount
              ? `Pay à§³${customAmount}`
              : "Continue to Payment"}

          </button>

        </div>


        {/* ========================================
            SECURITY NOTE
        ======================================== */}

        <p className="mx-auto mt-5 max-w-xl text-center text-xs opacity-50">
          Credits are added only after payment
          verification is completed by the server.
        </p>

      </div>

    </div>
  );
}
