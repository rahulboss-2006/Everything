import { useState } from "react";

import {
  Upload,
  FileText,
  X,
  ArrowRight,
} from "lucide-react";

import ImageEditor from "./editor/ImageEditor";


/* =========================================================
   NORMALIZE EDITED FILE NAME
   =========================================================

   Examples:

   photo.jpg
   photo-edited.jpg
   photo-cropped.jpg
   photo-edited-edited.jpg
   photo-cropped-edited.jpg

   সবশেষে:

   photo-edited.jpg
========================================================= */

function createEditedFileName(file) {
  if (!file?.name) {
    return file?.name || "edited-image";
  }

  const lastDotIndex = file.name.lastIndexOf(".");

  const hasExtension =
    lastDotIndex > 0;

  const extension = hasExtension
    ? file.name.slice(lastDotIndex)
    : "";

  let baseName = hasExtension
    ? file.name.slice(0, lastDotIndex)
    : file.name;


  /* -----------------------------------------
     Remove generated suffixes
  ----------------------------------------- */

  baseName = baseName
    .replace(/[-_ ]edited$/i, "")
    .replace(/[-_ ]cropped$/i, "");


  /*
     Remove multiple generated suffixes.

     photo-edited-edited
     photo-cropped-edited
     photo-edited-cropped

     সব clean হয়ে:
     photo
  */

  let previousName = "";

  while (previousName !== baseName) {

    previousName = baseName;

    baseName = baseName
      .replace(/[-_ ]edited$/i, "")
      .replace(/[-_ ]cropped$/i, "");
  }


  return `${baseName}-edited${extension}`;
}


/* =========================================================
   CREATE RENAMED FILE
========================================================= */

function renameEditedFile(file) {

  if (!(file instanceof File)) {
    return file;
  }

  const newName =
    createEditedFileName(file);


  /*
     যদি নাম already correct হয়,
     তাহলে নতুন File বানানোর দরকার নেই।
  */

  if (file.name === newName) {
    return file;
  }


  return new File(
    [file],
    newName,
    {
      type: file.type,
      lastModified: file.lastModified,
    }
  );
}


export default function DropZone({
  file,
  extension,
  options,
  selectedFormat,
  setSelectedFormat,
  isConverting,
  conversionStatus,
  error,
  previewUrl,
  onFileSelect,
  onRemoveFile,
  onConvert,
  onEditComplete,
}) {

  const [dragging, setDragging] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);


  /* =======================================
     FILE INPUT
  ======================================= */

  function handleFileChange(event) {

    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      onFileSelect(selectedFile);
    }

    // Same file আবার select করার সুযোগ
    event.target.value = "";
  }


  /* =======================================
     DRAG OVER
  ======================================= */

  function handleDragOver(event) {

    event.preventDefault();
    event.stopPropagation();

    setDragging(true);
  }


  /* =======================================
     DRAG LEAVE
  ======================================= */

  function handleDragLeave(event) {

    event.preventDefault();
    event.stopPropagation();

    setDragging(false);
  }


  /* =======================================
     DROP
  ======================================= */

  function handleDrop(event) {

    event.preventDefault();
    event.stopPropagation();

    setDragging(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }


  /* =======================================
     EDIT COMPLETE
  ======================================= */

  function handleEditorComplete(editedFile) {

    if (!editedFile) {
      return;
    }


    /*
       Important:

       ImageEditor থেকে যদি আসে:

       photo.jpg
       photo-cropped.jpg
       photo-edited.jpg
       photo-edited-edited.jpg

       এখানে সব normalize হবে:

       photo-edited.jpg
    */

    const finalEditedFile =
      renameEditedFile(editedFile);


    /*
       Parent/Home-এ updated File পাঠানো হচ্ছে।

       এর ফলে main image preview-ও update হবে,
       যদি parent-এর onEditComplete file state update করে।
    */

    onEditComplete?.(finalEditedFile);


    /*
       Editor বন্ধ
    */

    setShowImageEditor(false);
  }


  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-3xl border-2 border-dashed p-4 transition sm:p-6 ${
        dragging
          ? "border-slate-950 bg-slate-100 dark:border-white dark:bg-slate-900"
          : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >

      {/* =================================
          EMPTY STATE
      ================================= */}

      {!file ? (

        <label
          htmlFor="everything-file-input"
          className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl px-4 text-center"
        >

          <input
            id="everything-file-input"
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
          />


          {/* ICON */}

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">

            <Upload size={28} />

          </div>


          {/* TITLE */}

          <h3 className="text-xl font-bold">
            Drop your file here
          </h3>


          {/* DESCRIPTION */}

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            or click to browse from your device
          </p>


          {/* BUTTON */}

          <span className="mt-6 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
            Choose File
          </span>


          {/* SUPPORTED */}

          <p className="mt-5 text-xs text-slate-400">
            JPG · JPEG · PNG · WEBP · PDF
          </p>


          {/* ERROR */}

          {error && (
            <p className="mt-4 text-sm font-medium text-red-500">
              {error}
            </p>
          )}

        </label>

      ) : (

        /* =================================
           FILE SELECTED
        ================================= */

        <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-950">

          {/* FILE HEADER */}

          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-center gap-4">

              {/* PREVIEW */}

              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">

                {extension === "pdf" ? (

                  <FileText size={30} />

                ) : (

                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />

                )}

              </div>


              {/* FILE INFO */}

              <div className="min-w-0">

                <h3 className="truncate font-bold">
                  {file.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">

                  {(file.size / 1024 / 1024).toFixed(2)}
                  {" MB"}
                  {" • "}
                  {extension.toUpperCase()}

                </p>

              </div>

            </div>


            {/* REMOVE */}

            <button
              type="button"
              onClick={onRemoveFile}
              disabled={isConverting}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label="Remove file"
            >

              <X size={20} />

            </button>

          </div>


          {/* =================================
              CONVERSION OPTIONS
          ================================= */}

          <div className="mt-8">

            <div className="mb-4 flex items-center gap-2">

              <ArrowRight size={18} />

              <h3 className="font-bold">
                Convert to
              </h3>

            </div>


            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {options.map((format) => (

                <button
                  type="button"
                  key={format}
                  disabled={isConverting}
                  onClick={() =>
                    setSelectedFormat(format)
                  }
                  className={`rounded-xl border px-4 py-4 text-sm font-bold uppercase transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selectedFormat === format
                      ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                      : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                  }`}
                >

                  {format}

                </button>

              ))}

            </div>

          </div>


          {/* =================================
              ACTIONS
          ================================= */}

          <div className="mt-8">

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* EDIT */}

              {extension !== "pdf" && (

                <button
                  type="button"
                  onClick={() =>
                    setShowImageEditor(true)
                  }
                  disabled={isConverting}
                  className="flex-1 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  Edit Image
                </button>

              )}


              {/* CONVERT */}

              <button
                type="button"
                onClick={onConvert}
                disabled={
                  !selectedFormat ||
                  isConverting
                }
                className="flex-1 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
              >

                {isConverting
                  ? conversionStatus || "Converting..."
                  : "Convert to..."}

              </button>

            </div>


            {/* ERROR */}

            {error && (

              <p className="mt-3 text-sm font-medium text-red-500">
                {error}
              </p>

            )}

          </div>

        </div>
      )}


      {/* =================================
          IMAGE EDITOR
      ================================= */}

      {showImageEditor &&
        file &&
        extension !== "pdf" && (

          <ImageEditor
            file={file}

            onClose={() =>
              setShowImageEditor(false)
            }

            onComplete={handleEditorComplete}
          />

        )}

    </div>
  );
}