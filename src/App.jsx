
import {
  useEffect,
  lazy,
  Suspense,
} from "react";

import {
  FileImage,
  FileText,
  Upload,
  Settings2,
} from "lucide-react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";

/* =========================================
   LAZY SECONDARY PAGES
========================================= */

const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const Recharge = lazy(() => import("./pages/Recharge"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminPanel = lazy(() => import("./admin/AdminPanel"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { warmUpServer } from "./utils/api";


/* =========================================
   APP LAYOUT
========================================= */

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">

      <Navbar />

      <main>
        {children}
      </main>

      <Footer />

    </div>
  );
}


/* =========================================
   APP
========================================= */

function App() {
  // Wake the (free-tier) backend while the user is still choosing a file.
  useEffect(() => {
    warmUpServer();
  }, []);

  return (
    <BrowserRouter basename="/Everything">

      <Suspense
        fallback={
          <div
            className="min-h-[50vh] px-4 py-16 text-center text-sm text-slate-500"
            role="status"
          >
            Loading page…
          </div>
        }
      >

        <Routes>

          {/* =================================
              HOME
          ================================= */}

          <Route
            path="/"
            element={
              <AppLayout>

                <Home />

                <section
                  className="border-t border-slate-200 px-4 py-20 dark:border-slate-800 sm:px-6 lg:px-8"
                >

                  <div className="mx-auto max-w-7xl">

                    <div className="mb-12">

                      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
                        Features
                      </p>

                      <h2 className="text-3xl font-bold sm:text-4xl">
                        Everything you need
                      </h2>

                      <p className="mt-4 text-slate-600 dark:text-slate-400">
                        One modern workspace for image
                        and PDF conversion.
                      </p>

                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                      <FeatureCard
                        icon={<Upload size={22} />}
                        title="Drag & Drop"
                        description="Drop your files directly into the converter."
                      />

                      <FeatureCard
                        icon={<FileImage size={22} />}
                        title="Image Converter"
                        description="Convert JPG, JPEG, PNG and WEBP files."
                      />

                      <FeatureCard
                        icon={<FileText size={22} />}
                        title="PDF Converter"
                        description="Convert PDF pages into popular image formats."
                      />

                      <FeatureCard
                        icon={<Settings2 size={22} />}
                        title="Image Editor"
                        description="Edit, crop, resize and optimize images."
                      />

                    </div>

                  </div>

                </section>


                <section
                  className="px-4 py-20 sm:px-6 lg:px-8"
                >

                  <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50 sm:p-12">

                    <h2 className="text-3xl font-bold">
                      One place for your files
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600 dark:text-slate-400">
                      Upload your file, select a format,
                      edit when needed, convert it,
                      and download the result.
                    </p>

                  </div>

                </section>

              </AppLayout>
            }
          />


          {/* =================================
              ABOUT
          ================================= */}

          <Route
            path="/about"
            element={
              <AppLayout>
                <About />
              </AppLayout>
            }
          />


          {/* =================================
              FEATURES
          ================================= */}

          <Route
            path="/features"
            element={
              <AppLayout>
                <Features />
              </AppLayout>
            }
          />


          {/* =================================
              CONTACT
          ================================= */}

          <Route
            path="/contact"
            element={
              <AppLayout>
                <Contact />
              </AppLayout>
            }
          />


          {/* =================================
              ADMIN
          ================================= */}

          <Route
            path="/admin"
            element={<AdminPanel />}
          />


          {/* =================================
              LOGIN
          ================================= */}

          <Route
            path="/login"
            element={<Auth />}
          />


          {/* =================================
              REGISTER
          ================================= */}

          <Route
            path="/register"
            element={<Auth />}
          />


          {/* =================================
              RECHARGE
          ================================= */}

          <Route
            path="/recharge"
            element={<Recharge />}
          />


          {/* =================================
              FORGOT PASSWORD
          ================================= */}

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />


          {/* =================================
              RESET PASSWORD
          ================================= */}

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />


          {/* =================================
              UNKNOWN URL
          ================================= */}

          <Route
            path="*"
            element={
              <AppLayout>
                <NotFound />
              </AppLayout>
            }
          />

        </Routes>

      </Suspense>

    </BrowserRouter>
  );
}


/* =========================================
   FEATURE CARD
========================================= */

function FeatureCard({
  icon,
  title,
  description,
}) {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">

      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

        {icon}

      </div>


      <h3 className="font-bold">
        {title}
      </h3>


      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">

        {description}

      </p>

    </div>

  );
}


export default App;

