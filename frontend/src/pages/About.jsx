import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  FileText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";

export default function About() {
  const highlights = [
    {
      icon: Zap,
      title: "Fast workflow",
      description:
        "Upload, choose your format, convert, and download with a simple workflow.",
    },
    {
      icon: ShieldCheck,
      title: "Built with security in mind",
      description:
        "Account authentication and server-side processing help protect your conversion workflow.",
    },
    {
      icon: Sparkles,
      title: "Simple experience",
      description:
        "A clean interface keeps file conversion straightforward without unnecessary complexity.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">

      {/* HERO */}

      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-slate-200/50 blur-3xl dark:bg-slate-800/30" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Sparkles size={16} />
            About Everything
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Everything you need for
            <span className="block text-slate-500 dark:text-slate-400">
              your files.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
            Everything is a modern file conversion workspace designed
            to make everyday image and PDF tasks easier, faster, and
            more convenient.
          </p>

        </div>
      </section>


      {/* MAIN INTRO */}

      <section className="px-4 py-16 sm:px-6 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">

          <div>

            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Our approach
            </p>

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Powerful tools without a complicated workflow.
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-600 dark:text-slate-400">
              Everything brings useful file tools together in one
              workspace. The goal is simple: make common conversion
              tasks easier to understand and quicker to complete.
            </p>

            <div className="mt-8 space-y-4">

              {[
                "Simple file upload",
                "Multiple conversion workflows",
                "Responsive interface",
                "Account-based credit system",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2
                    size={19}
                    className="shrink-0 text-slate-700 dark:text-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {item}
                  </span>
                </div>
              ))}

            </div>

          </div>


          {/* VISUAL CARD */}

          <div className="relative">

            <div className="absolute -inset-4 rounded-[2rem] bg-slate-200/40 blur-2xl dark:bg-slate-800/20" />

            <div className="relative rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  <FileImage size={24} />

                  <p className="mt-5 text-sm font-semibold">
                    Images
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Convert supported image formats.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  <FileText size={24} />

                  <p className="mt-5 text-sm font-semibold">
                    PDFs
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Work with image and PDF conversions.
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-slate-900 p-6 text-white dark:bg-white dark:text-slate-950">

                  <Sparkles size={24} />

                  <p className="mt-5 text-lg font-bold">
                    One workspace.
                  </p>

                  <p className="mt-2 text-sm leading-6 opacity-70">
                    Upload, convert, edit when needed, and download.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* HIGHLIGHTS */}

      <section className="border-t border-slate-200 px-4 py-20 dark:border-slate-800 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Why Everything
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Designed around a simple experience.
            </h2>

          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">

            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 transition group-hover:scale-105 dark:bg-slate-800">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-6 text-lg font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              );
            })}

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="px-4 py-20 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-900 p-8 text-white dark:bg-white dark:text-slate-950 sm:p-12">

          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">

            <div>

                            <h2 className="text-3xl font-bold">
                                Ready to convert?
                            </h2>

                            <p className="mt-3 max-w-xl text-sm leading-6 opacity-70">
                                Go back to the workspace and start working with your files.
                            </p>

                        </div>

                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-105 dark:bg-slate-950 dark:text-white"
                        >
                            <span className="!text-slate-950 dark:!text-white">
                                Start converting
                            </span>
                            <ArrowRight
                                size={17}
                                className="shrink-0 text-slate-950 dark:text-white"
                                aria-hidden="true"
                            />
                        </Link>

                    </div>

                </div>

            </section>

        </div>
    );
}
