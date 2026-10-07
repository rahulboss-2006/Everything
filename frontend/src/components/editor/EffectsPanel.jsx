import {
  useMemo,
  useState,
} from "react";

import {
  EFFECT_CATEGORIES,
} from "../../utils/editorEffects";


/* =========================================================
   EFFECT FILTER
========================================================= */

function getEffectFilter(effect) {
  if (!effect) {
    return "none";
  }

  if (
    typeof effect.filter === "string" &&
    effect.filter.trim()
  ) {
    return effect.filter;
  }

  const filters = [];

  if (
    typeof effect.brightness === "number" &&
    effect.brightness !== 0
  ) {
    filters.push(
      `brightness(${Math.max(
        0,
        100 + effect.brightness
      )}%)`
    );
  }

  if (
    typeof effect.contrast === "number" &&
    effect.contrast !== 0
  ) {
    filters.push(
      `contrast(${Math.max(
        0,
        100 + effect.contrast
      )}%)`
    );
  }

  if (
    typeof effect.saturation === "number" &&
    effect.saturation !== 0
  ) {
    filters.push(
      `saturate(${Math.max(
        0,
        100 + effect.saturation
      )}%)`
    );
  }

  if (
    typeof effect.grayscale === "number" &&
    effect.grayscale !== 0
  ) {
    filters.push(
      `grayscale(${Math.max(
        0,
        Math.min(
          100,
          effect.grayscale
        )
      )}%)`
    );
  }

  if (
    typeof effect.sepia === "number" &&
    effect.sepia !== 0
  ) {
    filters.push(
      `sepia(${Math.max(
        0,
        Math.min(
          100,
          effect.sepia
        )
      )}%)`
    );
  }

  if (
    typeof effect.invert === "number" &&
    effect.invert !== 0
  ) {
    filters.push(
      `invert(${Math.max(
        0,
        Math.min(
          100,
          effect.invert
        )
      )}%)`
    );
  }

  if (
    typeof effect.hueRotate === "number" &&
    effect.hueRotate !== 0
  ) {
    filters.push(
      `hue-rotate(${effect.hueRotate}deg)`
    );
  }

  if (
    typeof effect.blur === "number" &&
    effect.blur !== 0
  ) {
    filters.push(
      `blur(${Math.max(
        0,
        effect.blur
      )}px)`
    );
  }

  if (
    typeof effect.opacity === "number" &&
    effect.opacity !== 1
  ) {
    const opacity =
      effect.opacity <= 1
        ? effect.opacity * 100
        : effect.opacity;

    filters.push(
      `opacity(${Math.max(
        0,
        Math.min(
          100,
          opacity
        )
      )}%)`
    );
  }

  return filters.length
    ? filters.join(" ")
    : "none";
}


/* =========================================================
   COMPONENT
========================================================= */

export default function EffectsPanel({
  imageSrc = "",
  baseImageSrc = "",
  image = null,

  selectedEffects = [],

  onSelect,

  onClose,
}) {

  const [category, setCategory] =
    useState(
      EFFECT_CATEGORIES?.[0]?.id ||
        "basic"
    );

  const [loadedImages, setLoadedImages] =
    useState({});


  /* =======================================================
     IMAGE SOURCE
  ======================================================= */

  const previewSrc =
    imageSrc ||
    (
      typeof image === "string"
        ? image
        : image?.currentSrc ||
          image?.src ||
          ""
    );

  const thumbnailSrc =
    baseImageSrc || previewSrc;


  /* =======================================================
     ACTIVE CATEGORY
  ======================================================= */

  const activeCategory =
    useMemo(() => {
      return (
        EFFECT_CATEGORIES?.find(
          (item) =>
            item.id === category
        ) || null
      );
    }, [category]);


  /* =======================================================
     SELECTED CHECK
  ======================================================= */

  function isSelected(effectId) {
    if (effectId === "Preview") {
      return false;
    }

    return (
      Array.isArray(selectedEffects) &&
      selectedEffects.includes(effectId)
    );
  }


  /* =======================================================
     SELECT EFFECT
  ======================================================= */

  function handleSelect(effect) {
    if (
      !effect ||
      !effect.id
    ) {
      return;
    }

    /*
     * IMPORTANT:
     * Preview is only a preview item.
     *
     * It is NOT an actual effect.
     * Therefore it must never call onSelect().
     *
     * This prevents:
     *
     * Preview -> toggleEffect("Preview")
     *
     * from modifying selectedEffects.
     */

    if (effect.id === "Preview") {
      return;
    }

    /*
     * Parent owns selectedEffects.
     * Send only the real effect ID.
     */

    if (
      typeof onSelect === "function"
    ) {
      onSelect(effect.id);
    }
  }


  /* =======================================================
     IMAGE LOAD
  ======================================================= */

  function handleImageLoad(effectId) {
    setLoadedImages(
      (previous) => ({
        ...previous,
        [effectId]: true,
      })
    );
  }


  /* =======================================================
     IMAGE ERROR
  ======================================================= */

  function handleImageError(effectId) {
    setLoadedImages(
      (previous) => ({
        ...previous,
        [effectId]: false,
      })
    );
  }


  return (
    <div
      className="
        fixed
        inset-0
        z-[120]
        flex
        items-end
        justify-center
        bg-slate-950/60
        p-2
        backdrop-blur-md
        sm:items-center
        sm:p-5
      "
    >

      <div
        className="
          flex
          max-h-[90vh]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-3xl
          border
          border-white/10
          bg-white
          shadow-2xl
          dark:bg-slate-950
        "
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            px-4
            py-4
            dark:border-slate-800
            sm:px-6
          "
        >

          <div>

            <h2
              className="
                text-lg
                font-bold
                text-slate-950
                dark:text-white
              "
            >
              Effects
            </h2>

            <p
              className="
                text-xs
                text-slate-500
                dark:text-slate-400
              "
            >
              Select multiple effects
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              bg-slate-100
              text-xl
              text-slate-600
              transition
              hover:scale-105
              dark:bg-slate-800
              dark:text-slate-300
            "
          >
            ×
          </button>

        </div>


        {/* =================================================
            CATEGORY TABS
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            overflow-x-auto
            border-b
            border-slate-200
            dark:border-slate-800
          "
        >

          {EFFECT_CATEGORIES?.map(
            (item) => (

              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setCategory(
                    item.id
                  )
                }
                className={`
                  shrink-0
                  px-4
                  py-3
                  text-xs
                  font-semibold
                  transition

                  ${
                    category === item.id
                      ? `
                        border-b-2
                        border-slate-950
                        text-slate-950
                        dark:border-white
                        dark:text-white
                      `
                      : `
                        text-slate-500
                        hover:text-slate-800
                        dark:hover:text-slate-200
                      `
                  }
                `}
              >
                {item.name}
              </button>

            )
          )}

        </div>


        {/* =================================================
            EFFECT GRID
        ================================================= */}

        <div
          className="
            max-h-[70vh]
            overflow-y-auto
            p-4
            sm:p-6
          "
        >

          <div
            className="
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
            "
          >

            {activeCategory?.effects?.map(
              (effect) => {

                /*
                 * Preview is NEVER considered selected.
                 */

                const selected =
                  effect.id !== "Preview" &&
                  isSelected(effect.id);

                const imageLoaded =
                  loadedImages[
                    effect.id
                  ] === true;

                const filter =
                  getEffectFilter(
                    effect
                  );


                return (
                  <button
                    key={effect.id}
                    type="button"

                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      handleSelect(
                        effect
                      );
                    }}

                    className={`
                      group
                      relative
                      overflow-hidden
                      rounded-2xl
                      border
                      text-left
                      transition
                      duration-200

                      ${
                        selected
                          ? `
                            border-violet-500
                            ring-2
                            ring-violet-500/30
                            shadow-lg
                            shadow-violet-500/10
                          `
                          : `
                            border-slate-200
                            hover:-translate-y-0.5
                            hover:shadow-lg
                            dark:border-slate-800
                          `
                      }
                    `}
                  >

                    {/* =================================
                        PREVIEW
                    ================================= */}

                    <div
                      className="
                        relative
                        aspect-square
                        overflow-hidden
                        bg-gradient-to-br
                        from-slate-200
                        via-slate-100
                        to-slate-300
                        dark:from-slate-800
                        dark:via-slate-900
                        dark:to-slate-700
                      "
                    >

                      {previewSrc ? (

                        <img
                          src={previewSrc}
                          alt={
                            effect.name ||
                            effect.label ||
                            effect.id
                          }

                          draggable="false"

                          onLoad={() =>
                            handleImageLoad(
                              effect.id
                            )
                          }

                          onError={() =>
                            handleImageError(
                              effect.id
                            )
                          }

                          className="
                            absolute
                            inset-0
                            z-0
                            h-full
                            w-full
                            select-none
                            object-contain
                            transition
                            duration-300
                            group-hover:scale-105
                          "

                          style={{
                            filter,
                          }}
                        />

                      ) : (

                        <div
                          className="
                            absolute
                            inset-0
                            flex
                            items-center
                            justify-center
                            text-xs
                            font-medium
                            text-slate-500
                            dark:text-slate-400
                          "
                        >
                          No canvas image
                        </div>

                      )}


                      {/* =============================
                          LOADING
                      ============================= */}

                      {previewSrc &&
                        !imageLoaded && (

                          <div
                            className="
                              absolute
                              inset-0
                              z-10
                              flex
                              items-center
                              justify-center
                              bg-gradient-to-br
                              from-slate-200
                              via-slate-100
                              to-slate-300
                              dark:from-slate-800
                              dark:via-slate-900
                              dark:to-slate-700
                            "
                          >

                            <span
                              className="
                                animate-pulse
                                text-2xl
                              "
                            >
                              ✨
                            </span>

                          </div>

                        )}


                      {/* =============================
                          SELECTED
                      ============================= */}

                      {selected && (

                        <div
                          className="
                            absolute
                            inset-0
                            z-20
                            bg-violet-600/10
                          "
                        />

                      )}


                      {/* =============================
                          CHECK
                      ============================= */}

                      {selected && (

                        <div
                          className="
                            absolute
                            right-2
                            top-2
                            z-30
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-full
                            bg-violet-600
                            text-sm
                            font-black
                            text-white
                            shadow-lg
                          "
                        >
                          ✓
                        </div>

                      )}

                    </div>


                    {/* =================================
                        NAME
                    ================================= */}

                    <div
                      className="
                        flex
                        min-h-[48px]
                        items-center
                        justify-between
                        gap-2
                        px-3
                        py-3
                      "
                    >

                      <div
                        className={`
                          min-w-0
                          truncate
                          text-xs
                          font-bold

                          ${
                            selected
                              ? `
                                text-violet-700
                                dark:text-violet-400
                              `
                              : `
                                text-slate-800
                                dark:text-slate-200
                              `
                          }
                        `}
                      >
                        {effect.name ||
                          effect.label ||
                          effect.id}
                      </div>


                      {selected && (

                        <span
                          className="
                            shrink-0
                            text-[10px]
                            font-bold
                            text-violet-600
                            dark:text-violet-400
                          "
                        >
                          ON
                        </span>

                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>


          {!activeCategory?.effects?.length && (

            <div
              className="
                flex
                min-h-[200px]
                items-center
                justify-center
                text-sm
                text-slate-500
              "
            >
              No effects available.
            </div>

          )}

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-3
            border-t
            border-slate-200
            px-4
            py-3
            dark:border-slate-800
            sm:px-6
          "
        >

          <div
            className="
              text-xs
              font-medium
              text-slate-500
              dark:text-slate-400
            "
          >
            {selectedEffects.length > 0
              ? `${selectedEffects.length} effect${
                  selectedEffects.length > 1
                    ? "s"
                    : ""
                } selected`
              : "No effects selected"}
          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              rounded-xl
              bg-slate-950
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:scale-[1.02]
              hover:bg-slate-800
              dark:bg-white
              dark:text-slate-950
              dark:hover:bg-slate-200
            "
          >
            Done
          </button>

        </div>

      </div>

    </div>
  );
}