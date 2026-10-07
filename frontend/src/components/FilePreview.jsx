import { FileText, X } from "lucide-react";

function FilePreview({ file, onRemove }) {
  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  const previewUrl = isImage
    ? URL.createObjectURL(file)
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-black"
      >
        <X size={18} />
      </button>

      {/* IMAGE PREVIEW */}
      {isImage && previewUrl && (
        <div className="flex min-h-[280px] items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-h-[420px] max-w-full rounded-xl object-contain shadow-lg"
          />
        </div>
      )}

      {/* PDF */}
      {isPdf && (
        <div className="flex min-h-[280px] flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">

          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900">
            <FileText size={38} />
          </div>

          <p className="mt-5 font-semibold">
            PDF File
          </p>

        </div>
      )}

      {/* FILE INFO */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">

        <p className="truncate font-semibold">
          {file.name}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>

      </div>

    </div>
  );
}

export default FilePreview;