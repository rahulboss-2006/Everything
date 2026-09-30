import {
ArrowRight,
Clock3,
Mail,
MessageSquare,
Send,
ShieldCheck,
Sparkles,
} from "lucide-react";

import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
const [submitted, setSubmitted] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit(event) {
event.preventDefault();

const form = event.currentTarget;
const formData = new FormData(form);

const data = {
  name: formData.get("name"),
  email: formData.get("email"),
  subject: formData.get("subject"),
  message: formData.get("message"),
};

setLoading(true);
setError("");

try {
  const response = await fetch(
    "http://localhost:5000/api/contact",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Unable to send your message."
    );
  }

  setSubmitted(true);
  form.reset();
} catch (err) {
  console.error("Contact form error:", err);

  setError(
    err.message ||
      "Something went wrong. Please try again later."
  );
} finally {
  setLoading(false);
}

}

return ( <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">

  {/* HERO */}
  <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">

    <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-slate-200/50 blur-3xl dark:bg-slate-800/30" />

    <div className="relative mx-auto max-w-4xl text-center">

      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <MessageSquare size={16} />
        Contact Everything
      </div>

      <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
        Let's talk about
        <span className="block text-slate-500 dark:text-slate-400">
          your experience.
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
        Have feedback, a question, or need help? Send a message
        using the form below.
      </p>

    </div>
  </section>


  {/* CONTACT AREA */}
  <section className="px-4 pb-20 sm:px-6 lg:px-8">

    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">

      {/* INFO */}
      <div className="space-y-5">

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-800 dark:bg-slate-900">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-950">
            <Mail size={22} />
          </div>

          <h2 className="mt-6 text-xl font-bold">
            Send us a message
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Use the contact form and provide enough detail so your
            message is easy to understand.
          </p>

        </div>


        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">

          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <Clock3 size={21} />

            <h3 className="mt-4 font-bold">
              Support
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Include your issue and relevant details in your message.
            </p>

          </div>


          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">

            <ShieldCheck size={21} />

            <h3 className="mt-4 font-bold">
              Account safety
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Never include passwords, verification codes, or private
              account credentials in a message.
            </p>

          </div>

        </div>

      </div>


      {/* FORM */}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">

        {submitted ? (

          <div className="flex min-h-[430px] flex-col items-center justify-center text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Send size={25} />
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              Message sent successfully
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Thanks for contacting us. Your message has been sent
              successfully.
            </p>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError("");
              }}
              className="mt-7 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Send another message
            </button>

          </div>

        ) : (

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                Contact form
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Tell us what's going on.
              </h2>

            </div>


            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
              >
                {error}
              </div>
            )}


            <div className="grid gap-5 sm:grid-cols-2">

              <div>

                <label
                  htmlFor="contact-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Name
                </label>

                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  disabled={loading}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
                />

              </div>


              <div>

                <label
                  htmlFor="contact-email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email
                </label>

                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
                />

              </div>

            </div>


            <div>

              <label
                htmlFor="contact-subject"
                className="mb-2 block text-sm font-semibold"
              >
                Subject
              </label>

              <input
                id="contact-subject"
                name="subject"
                type="text"
                required
                disabled={loading}
                placeholder="How can we help?"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
              />

            </div>


            <div>

              <label
                htmlFor="contact-message"
                className="mb-2 block text-sm font-semibold"
              >
                Message
              </label>

              <textarea
                id="contact-message"
                name="message"
                rows="6"
                required
                disabled={loading}
                placeholder="Write your message..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400"
              />

            </div>


            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-white dark:text-slate-950"
            >
              <Send size={17} />
              {loading ? "Sending..." : "Send Message"}
            </button>

          </form>

        )}

      </div>

    </div>

  </section>


  {/* BOTTOM CTA */}
  <section className="px-4 pb-20 sm:px-6 lg:px-8">

    <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 rounded-[2rem] bg-slate-900 p-8 text-white dark:bg-white dark:text-slate-950 sm:flex-row sm:items-center sm:p-10">

      <div>

        <div className="flex items-center gap-2">
          <Sparkles size={18} />

          <span className="text-sm font-bold">
            Everything
          </span>
        </div>

        <h2 className="mt-3 text-2xl font-bold">
          Want to get back to your files?
        </h2>

      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-105 dark:bg-slate-950 dark:text-white"
      >
        <span className="!text-slate-950 dark:!text-white">Go to Home</span>
        <ArrowRight
          size={17}
          className="shrink-0 text-slate-950 dark:text-white"
          aria-hidden="true"
        />
      </Link>

    </div>

  </section>

</div>

);
}
