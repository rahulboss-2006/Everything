import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileImage,
  FileText,
  Upload,
  ShieldCheck,
  Zap,
  Sparkles,
  X,
  ArrowRight,
  Settings2,
} from "lucide-react";

import {
  getFileCategory,
  getDetectedFormat,
} from "./utils/fileTypes";

import {
  getConversionOptions,
} from "./utils/formatOptions";

import {
  convertImage,
  convertImageToPdf,
  convertPdfToImage,
} from "./services/converterApi";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import DropZone from "./components/DropZone";

import Home from "./pages/Home";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Recharge from "./pages/Recharge";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./admin/AdminPanel";
import {
  useAuth,
} from "./context/AuthContext";
import { downloadFile } from "./utils/downloadFile";


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
  const { user } = useAuth();
  return (
    <BrowserRouter basename="/Everything">

      <Routes>

        {/* HOME */}

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


        {/* ABOUT */}

        <Route
          path="/about"
          element={
            <AppLayout>
              <About />
            </AppLayout>
          }
        />


        {/* FEATURES */}

        <Route
          path="/features"
          element={
            <AppLayout>
              <Features />
            </AppLayout>
          }
        />


        {/* CONTACT */}

        <Route
          path="/contact"
          element={
            <AppLayout>
              <Contact />
            </AppLayout>
          }
        />


        {/* ADMIN PANEL */}

        <Route
          path="/admin"
          element={<AdminPanel />}
        />


        {/* LOGIN */}

        <Route
          path="/login"
          element={<Auth />}
        />




        {/* REGISTER */}

        <Route
          path="/register"
          element={<Auth />}
        />


        {/* RECHARGE */}

        <Route
          path="/recharge"
          element={<Recharge />}
        />


        {/* UNKNOWN URL */}

        <Route
          path="*"
          element={
            <AppLayout>
              <Home />
            </AppLayout>
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

      </Routes>

    </BrowserRouter>
  );
}


/* =========================================
   UPLOAD BOX
========================================= */

function UploadBox() {

  const [dragging, setDragging] =
    useState(false);

  const [file, setFile] =
    useState(null);

  const [selectedFormat, setSelectedFormat] =
    useState(null);

  const [isConverting, setIsConverting] =
    useState(false);

  const [conversionStatus, setConversionStatus] =
    useState("");

  const [showImageEditor, setShowImageEditor] =
    useState(false);

  const [error, setError] =
    useState("");


  /* =======================================
     HANDLE FILE
  ======================================= */

  function handleFile(selectedFile) {

    if (!selectedFile) {
      return;
    }


    const category =
      getFileCategory(selectedFile);


    const detectedFormat =
      getDetectedFormat(selectedFile);


    const supportedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "pdf",
    ];


    if (
      category === "unknown" ||
      !supportedFormats.includes(
        detectedFormat
      )
    ) {

      setError(
        "Please upload JPG, JPEG, PNG, WEBP or PDF."
      );

      return;
    }


    setFile(selectedFile);

    setSelectedFormat(null);

    setConversionStatus("");

    setError("");
  }


  /* =======================================
     EXTENSION
  ======================================= */

  const extension =
    useMemo(() => {

      if (!file) {
        return "";
      }

      return getDetectedFormat(file);

    }, [file]);


  /* =======================================
     OPTIONS
  ======================================= */

  const options =
    useMemo(() => {

      if (!extension) {
        return [];
      }

      return getConversionOptions(
        extension
      );

    }, [extension]);


  /* =======================================
     CONVERT
  ======================================= */

  const handleConvert =
    async () => {

    console.log("CONVERT CREDIT CHECK:", user?.credits, "USER:", user);

    if ((user?.credits ?? 0) <= 0) {
      window.location.href = "/Everything/recharge";
      return;
    }

      if (!file) {

        setError(
          "Please select a file."
        );

        return;
      }


      if (!selectedFormat) {

        setError(
          "Please select an output format."
        );

        return;
      }


      try {

        setError("");

        setIsConverting(true);


        setConversionStatus(
          extension === "pdf"
            ? "Analyzing PDF..."
            : "Preparing conversion..."
        );


        let result;


        /* =================================
           IMAGE Ã¢â€ â€™ PDF
        ================================= */

        if (
          extension !== "pdf" &&
          selectedFormat === "pdf"
        ) {

          setConversionStatus(
            "Converting image to PDF..."
          );


          result =
            await convertImageToPdf(file);
        }


        /* =================================
           IMAGE Ã¢â€ â€™ IMAGE
        ================================= */

        else if (
          extension !== "pdf"
        ) {

          setConversionStatus(
            `Converting to ${selectedFormat.toUpperCase()}...`
          );


          result =
            await convertImage(
              file,
              selectedFormat
            );
        }


        /* =================================
           PDF Ã¢â€ â€™ IMAGE
        ================================= */

        else {

          setConversionStatus(
            `Converting PDF to ${selectedFormat.toUpperCase()}...`
          );


          result =
            await convertPdfToImage(
              file,
              selectedFormat
            );
        }


        /* =================================
           RESULT TYPE
        ================================= */

        if (
          result?.type === "zip"
        ) {

          setConversionStatus(
            "Creating ZIP file..."
          );

        } else {

          setConversionStatus(
            "Preparing download..."
          );

        }


        /* =================================
           DOWNLOAD
        ================================= */

        const downloadUrl =
          result?.downloadUrl;


        if (!downloadUrl) {
          throw new Error(
            "Download URL was not returned by the server."
          );
        }


        await downloadFile(downloadUrl, result?.fileName);




        /* =================================
           SUCCESS
        ================================= */

        setConversionStatus(
          "Ã¢Å“â€œ Conversion complete"
        );


      } catch (error) {

        console.error(
          "FRONTEND CONVERSION ERROR:",
          error
        );


        console.error(
          "ERROR NAME:",
          error?.name
        );


        console.error(
          "ERROR MESSAGE:",
          error?.message
        );


        setError(
          error?.message ||
          "Conversion failed."
        );


        setConversionStatus("");

        setIsConverting(false);

        return;
      }


      /* =================================
         CLEAR SUCCESS
      ================================= */

      setTimeout(() => {

        setConversionStatus("");

        setIsConverting(false);

      }, 1500);

    };


  /* =======================================
     DROP
  ======================================= */

  function handleDrop(event) {

    event.preventDefault();

    setDragging(false);


    const droppedFile =
      event.dataTransfer.files?.[0];


    handleFile(droppedFile);
  }


  /* =======================================
     REMOVE FILE
  ======================================= */

  function removeFile() {

    setFile(null);

    setSelectedFormat(null);

    setConversionStatus("");

    setError("");

    setShowImageEditor(false);
  }


  /* =======================================
     PREVIEW URL
  ======================================= */

  const previewUrl =
    useMemo(() => {

      if (
        !file ||
        extension === "pdf"
      ) {

        return "";
      }


      return URL.createObjectURL(file);

    }, [file, extension]);


  /* =======================================
     CLEANUP PREVIEW
  ======================================= */

  useEffect(() => {

    return () => {

      if (previewUrl) {

        URL.revokeObjectURL(
          previewUrl
        );

      }

    };

  }, [previewUrl]);


  /* =======================================
     UI
  ======================================= */

  return (

    <DropZone
      file={file}
      extension={extension}
      options={options}
      selectedFormat={selectedFormat}
      setSelectedFormat={setSelectedFormat}
      isConverting={isConverting}
      conversionStatus={conversionStatus}
      error={error}
      previewUrl={previewUrl}
      onFileSelect={handleFile}
      onRemoveFile={removeFile}
      onConvert={handleConvert}
      onEditComplete={(editedFile) => {

        setFile(editedFile);

        setSelectedFormat(null);

        setConversionStatus("");

        setError("");

      }}
    />

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


