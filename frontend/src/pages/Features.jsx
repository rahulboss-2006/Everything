import {
  ArrowRight,
  FileImage,
  FileText,
  FolderArchive,
  ImagePlus,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";

const features = [
  {
    icon: MousePointer2,
    title: "Drag & Drop",
    description:
      "Drop supported files directly into the workspace for a quick start.",
  },
  {
    icon: FileImage,
    title: "Image Converter",
    description:
      "Convert supported JPG, JPEG, PNG, and WEBP files into other formats.",
  },
  {
    icon: FileText,
    title: "PDF Converter",
    description:
      "Convert images to PDF and PDF pages into supported image formats.",
  },
  {
    icon: ImagePlus,
    title: "Image Editing",
    description:
      "Edit images when needed before completing your conversion workflow.",
  },
  {
    icon: FolderArchive,
    title: "ZIP Output",
    description:
      "Handle multi-file conversion results through downloadable ZIP output.",
  },
  {
    icon: ShieldCheck,
    title: "Account Protection",
    description:
      "Authentication helps keep account-based features connected to the right user.",
  },
  {
    icon: Zap,
    title: "Fast Workflow",
    description:
      "Move from upload to conversion and download with minimal steps.",
  },
  {
    icon: Sparkles,
    title: "Modern Interface",
    description:
      "A responsive interface with light and dark themes across devices.",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">

      {/* HERO */}

      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">

        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-slate-200/50 blur-3xl dark:bg-slate-800/30" />

        <div className="relative mx-auto max-w-4xl text-center">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Sparkles size={16} />
            Everything Features
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Tools built for
            <span className="block text-slate-500 dark:text-slate-400">
              everyday file work.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
            Explore the tools and workflows available in Everything,
            all inside one clean workspace.
          </p>

        </div>

      </section>


      {/* FEATURE GRID */}

      <section className="px-4 py-16 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                >

                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-100 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100 dark:bg-slate-800" />

                  <div className="relative">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 transition duration-300 group-hover:scale-110 dark:bg-slate-800">
                      <Icon size={22} />
                    </div>

                    <span className="mt-6 block text-xs font-bold uppercase tracking-widest text-slate-400">
                      0{index + 1}
                    </span>

                    <h2 className="mt-2 text-lg font-bold">
                      {feature.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>

                  </div>

                </article>
              );
            })}

          </div>

        </div>

      </section>


      {/* WORKFLOW */}

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-20 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-6xl">

          <div className="text-center">

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
              Simple workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              From file to result in a few steps.
            </h2>

          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">

            {[
              ["01", "Upload", "Choose a supported file or drag it into the workspace."],
              ["02", "Customize", "Select your desired output format and available options."],
              ["03", "Download", "Complete the conversion and download your result."],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-3xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-950"
              >

                <span className="text-sm font-black text-slate-400">
                  {number}
                </span>

                <h3 className="mt-5 text-xl font-bold">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {description}
                </p>

              </div>
            ))}

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="px-4 py-20 sm:px-6 lg:px-8">

        <div className="mx-auto max-w-5xl rounded-[2rem] bg-slate-900 p-8 text-white dark:bg-white dark:text-slate-950 sm:p-12">

          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">

                        <div>

                            <h2 className="text-3xl font-bold">
                                Try the workspace
                            </h2>

                            <p className="mt-3 text-sm opacity-70">
                                Start with a file and explore the available conversion tools.
                            </p>

                        </div>

                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-105 dark:bg-slate-950 dark:text-white"
                        >
                            <span className="!text-slate-950 dark:!text-white">
                            Open Everything
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
