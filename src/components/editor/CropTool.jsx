import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Cropper from "react-easy-crop";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error("Could not load image for cropping."));
    };

    image.src = url;
  });
}

async function getCroppedImage(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context.");
  }

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error("Could not create cropped image.")
          );
          return;
        }

        resolve(blob);
      },
      "image/png",
      1
    );
  });
}

export default function CropTool({
  image,
  onApply,
  onCancel,
}) {
  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState(null);

  const [aspect, setAspect] = useState(null);

  const [applying, setApplying] = useState(false);

  const [error, setError] = useState("");

  const handleCropComplete = useCallback(
    (_, croppedPixels) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const cropAreaRef = useRef(null);

 useEffect(() => {
  function handleWheel(event) {
    const cropArea = cropAreaRef.current;

    if (!cropArea) {
      return;
    }

    // Mouse cursor crop area-এর ভিতরে আছে কিনা
    if (!cropArea.contains(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setZoom((currentZoom) => {
      const step = 0.1;

      const nextZoom =
        event.deltaY < 0
          ? currentZoom + step
          : currentZoom - step;

      return Math.min(
        3,
        Math.max(
          1,
          Number(nextZoom.toFixed(1))
        )
      );
    });
  }

  document.addEventListener(
    "wheel",
    handleWheel,
    {
      passive: false,
      capture: true,
    }
  );

  return () => {
    document.removeEventListener(
      "wheel",
      handleWheel,
      true
    );
  };
}, []);

  async function handleApply() {
    if (!croppedAreaPixels || applying) {
      return;
    }

    try {
      setError("");
      setApplying(true);

      const blob = await getCroppedImage(
        image.src,
        croppedAreaPixels
      );

      const file = new File(
        [blob],
        "cropped-image.png",
        {
          type: "image/png",
        }
      );

      const previewUrl = URL.createObjectURL(blob);

      onApply({
        file,
        previewUrl,
      });
    } catch (error) {
      console.error("Crop error:", error);

      setError(
        error?.message || "Could not crop the image."
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Crop Image
          </h3>

          <p className="text-xs text-slate-400">
            Drag the image and resize the crop area
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={applying}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

     {/* Crop Area */}
<div
  ref={cropAreaRef}
  className="relative min-h-0 flex-1 overflow-hidden"
  style={{
    touchAction: "none",
  }}
>
  <Cropper
  image={image.src}
  crop={crop}
  zoom={zoom}
  aspect={aspect || undefined}
  onCropChange={setCrop}
  onCropComplete={handleCropComplete}
  onZoomChange={setZoom}
  zoomWithScroll={false}
  objectFit="contain"
  showGrid
  restrictPosition={false}
/>
</div>

      {/* Controls */}
      <div className="border-t border-white/10 bg-slate-950/90 p-4">
        <div className="mx-auto flex max-w-xl flex-col gap-4">

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Aspect Ratio */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">
              Aspect Ratio
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                ["Free", null],
                ["1 : 1", 1],
                ["4 : 5", 4 / 5],
                ["16 : 9", 16 / 9],
                ["9 : 16", 9 / 16],
              ].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAspect(value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${aspect === value
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Zoom
              </span>

              <span className="text-xs text-slate-500">
                {zoom.toFixed(1)}x
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(event) =>
                setZoom(Number(event.target.value))
              }
              className="w-full accent-violet-500"
            />
          </div>

          {/* Apply */}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !croppedAreaPixels}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:scale-[1.01] hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying
              ? "Applying Crop..."
              : "✓ Apply Crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
