import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Sparkles,
  ShieldCheck,
  Zap,
  FileImage,
  FileText,
} from "lucide-react";

import DropZone from "../components/DropZone";

import {
  getFileCategory,
  getDetectedFormat,
} from "../utils/fileTypes";

import {
  getConversionOptions,
} from "../utils/formatOptions";

import {
  convertImage,
  convertImageToPdf,
  convertPdfToImage,
} from "../services/converterApi";

import { useAuth } from "../context/AuthContext";

const Home = () => {
  // -----------------------------
  // File state
  // -----------------------------
  const [file, setFile] = useState(null);

  const { user, updateCredits } = useAuth();

  // -----------------------------
  // Conversion state
  // -----------------------------
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState("");
  const [error, setError] = useState("");

  // -----------------------------
  // Detect file extension
  // -----------------------------
  const extension = useMemo(() => {
    if (!file) return "";

    return getDetectedFormat(file);
  }, [file]);

  // -----------------------------
  // Get conversion options
  // -----------------------------
  const options = useMemo(() => {
    if (!extension) return [];

    return getConversionOptions(extension);
  }, [extension]);

  // -----------------------------
  // Preview URL
  // -----------------------------
  const previewUrl = useMemo(() => {
    if (!file) return "";

    if (extension === "pdf") {
      return "";
    }

    return URL.createObjectURL(file);
  }, [file, extension]);

  // -----------------------------
  // Cleanup preview URL
  // -----------------------------
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // -----------------------------
  // File select
  // -----------------------------
  function handleFileSelect(selectedFile) {
    if (!selectedFile) return;

    const category = getFileCategory(selectedFile);
    const detectedFormat = getDetectedFormat(selectedFile);

    const supportedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "pdf",
    ];

    if (
      category === "unknown" ||
      !supportedFormats.includes(detectedFormat)
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

  // -----------------------------
  // Remove file
  // -----------------------------
  function handleRemoveFile() {
    setFile(null);
    setSelectedFormat(null);
    setConversionStatus("");
    setError("");
  }

  // -----------------------------
  // Convert file
  // -----------------------------
  async function handleConvert() {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (!selectedFormat) {
      setError("Please select an output format.");
      return;
    }

    try {
      setError("");
      setIsConverting(true);

      let result;

      // Image â†’ PDF
      if (
        extension !== "pdf" &&
        selectedFormat === "pdf"
      ) {
        setConversionStatus(
          "Converting image to PDF..."
        );

        result = await convertImageToPdf(file);
      }

      // Image â†’ Image
      else if (extension !== "pdf") {
        setConversionStatus(
          `Converting to ${selectedFormat.toUpperCase()}...`
        );

        result = await convertImage(
          file,
          selectedFormat
        );
      }

      // PDF â†’ Image
      else {
        setConversionStatus(
          `Converting PDF to ${selectedFormat.toUpperCase()}...`
        );

        result = await convertPdfToImage(
          file,
          selectedFormat
        );
      }

      // -----------------------------
      // Check result
      // -----------------------------
      if (!result?.downloadUrl) {
        throw new Error(
          "Download URL was not returned by the server."
        );
      }

      setConversionStatus(
        "Preparing download..."
      );

      // -----------------------------
      // Download
      // -----------------------------
      const link = document.createElement("a");

      link.href = result.downloadUrl;

      if (result.fileName) {
        link.download = result.fileName;
      }

      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      link.remove();

      if (
        result?.creditsRemaining !== undefined
      ) {
        updateCredits(
          result.creditsRemaining
        );
      }

      setConversionStatus(
        "âœ“ Conversion complete"
      );

      // -----------------------------
      // Reset conversion state
      // -----------------------------
      setTimeout(() => {
        setConversionStatus("");
        setIsConverting(false);
      }, 1500);

    } catch (conversionError) {
  console.error("FRONTEND CONVERSION ERROR:", conversionError);
  console.error("ERROR STATUS:", conversionError?.status);
  console.error("ERROR DATA:", conversionError?.data);

  if (
    conversionError?.status === 402 ||
    conversionError?.data?.message === "Insufficient credits."
  ) {
    setConversionStatus("");
    setIsConverting(false);

    window.location.hash = "#/recharge";
    return;
  }

  setError(conversionError?.message || "Conversion failed.");
  setConversionStatus("");
  setIsConverting(false);
}

  }

  // -----------------------------
  // Image editor complete
  // -----------------------------
  function handleEditComplete(editedFile) {
    if (!editedFile) return;

    setFile(editedFile);
    setSelectedFormat(null);
    setConversionStatus("");
    setError("");
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8"
    >
      {/* Background glow */}
      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-0
          -z-10
          h-[500px]
          w-[700px]
          -translate-x-1/2
          rounded-full
          bg-slate-200/60
          blur-3xl
          dark:bg-slate-800/30
        "
      />

      {/* Hero */}
      <div className="mx-auto max-w-4xl text-center">

        {/* Badge */}
        <div
          className="
            mb-6
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-slate-200
            bg-white
            px-4
            py-2
            text-sm
            font-medium
            text-slate-600
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
            dark:text-slate-300
          "
        >
          <Sparkles size={15} />

          Simple. Fast. Powerful.
        </div>

        {/* Heading */}
        <h1
          className="
            text-4xl
            font-black
            tracking-tight
            text-slate-900
            sm:text-6xl
            lg:text-7xl
            dark:text-white
          "
        >
          Convert your files

          <span
            className="
              block
              text-slate-400
              dark:text-slate-500
            "
          >
            without the complexity.
          </span>
        </h1>

        {/* Description */}
        <p
          className="
            mx-auto
            mt-6
            max-w-2xl
            text-base
            leading-7
            text-slate-600
            sm:text-lg
            dark:text-slate-400
          "
        >
          Convert images and PDF files between
          popular formats. Edit your images,
          convert your documents, and download
          your results in seconds.
        </p>
      </div>

      {/* Converter */}
      <div
        id="converter"
        className="mx-auto mt-12 max-w-4xl"
      >
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
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onConvert={handleConvert}
          onEditComplete={handleEditComplete}
        />
      </div>

      {/* Features */}
      <div
        className="
          mx-auto
          mt-10
          flex
          max-w-3xl
          flex-wrap
          items-center
          justify-center
          gap-x-8
          gap-y-4
          text-sm
          text-slate-500
          dark:text-slate-400
        "
      >
        <span className="flex items-center gap-2">
          <ShieldCheck size={17} />
          Easy to use
        </span>

        <span className="flex items-center gap-2">
          <Zap size={17} />
          Fast conversion
        </span>

        <span className="flex items-center gap-2">
          <FileImage size={17} />
          Image tools
        </span>

        <span className="flex items-center gap-2">
          <FileText size={17} />
          PDF tools
        </span>
      </div>
    </section>
  );
};

export default Home;
