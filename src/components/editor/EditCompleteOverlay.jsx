import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";

function EditCompleteOverlay({
  edits = [],
  file,
  onComplete,
  processing = false,
}) {
  const [visibleItems, setVisibleItems] = useState(0);

  const completedRef = useRef(false);
  const editListRef = useRef(null);

  /*
  =========================================================
  SAFE EDIT LIST
  =========================================================
  */

  const uniqueEdits = Array.from(
    new Set(
      Array.isArray(edits)
        ? edits.filter(Boolean)
        : []
    )
  );

  /*
  =========================================================
  AUTO SCROLL EDIT LIST
  =========================================================
  */

  useEffect(() => {
    if (!editListRef.current) return;

    const container = editListRef.current;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [visibleItems]);

  /*
  =========================================================
  LOCK PAGE SCROLL
  =========================================================
  */

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    const previousBodyOverflow =
      body.style.overflow;

    const previousHtmlOverflow =
      html.style.overflow;

    const previousBodyTouchAction =
      body.style.touchAction;

    const previousHtmlTouchAction =
      html.style.touchAction;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    body.style.touchAction = "none";
    html.style.touchAction = "none";

    return () => {
      body.style.overflow =
        previousBodyOverflow;

      html.style.overflow =
        previousHtmlOverflow;

      body.style.touchAction =
        previousBodyTouchAction;

      html.style.touchAction =
        previousHtmlTouchAction;
    };
  }, []);

  /*
  =========================================================
  COMPLETE ANIMATION
  =========================================================
  */

  useEffect(() => {
    /*
    ---------------------------------------------------------
    PROCESSING
    ---------------------------------------------------------
    */

    if (processing) {
      setVisibleItems(0);
      completedRef.current = false;

      return;
    }

    /*
    ---------------------------------------------------------
    RESET
    ---------------------------------------------------------
    */

    setVisibleItems(0);
    completedRef.current = false;

    const total = uniqueEdits.length;

    /*
    ---------------------------------------------------------
    NO EDITS
    ---------------------------------------------------------
    */

    if (!total) {
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }, 900);

      return () => {
        clearTimeout(timer);
      };
    }

    /*
    ---------------------------------------------------------
    SHOW EDITS ONE BY ONE
    ---------------------------------------------------------
    */

    const timers = [];

    uniqueEdits.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(index + 1);
      }, 350 + index * 280);

      timers.push(timer);
    });

    /*
    ---------------------------------------------------------
    FINISH
    ---------------------------------------------------------
    */

    const finishDelay =
      350 +
      total * 280 +
      900;

    const completeTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;

        onComplete?.();
      }
    }, finishDelay);

    timers.push(completeTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [
    processing,
    onComplete,
    uniqueEdits.length,
  ]);

  /*
  =========================================================
  PROCESSING UI
  =========================================================
  */

  if (processing) {
    return (
      <div
        className="
          fixed
          inset-0
          z-[200]
          overflow-hidden
          overscroll-none
          bg-slate-950/70
          p-4
          backdrop-blur-xl
        "
        style={{
          touchAction: "none",
        }}
      >
        <div
          className="
            flex
            h-full
            items-center
            justify-center
            py-6
          "
        >
          <div
            className="
              relative
              flex
              max-h-[calc(100vh-3rem)]
              w-full
              max-w-md
              flex-col
              overflow-hidden
              rounded-[28px]
              border
              border-white/10
              bg-white
              p-6
              shadow-[0_30px_100px_rgba(0,0,0,0.45)]
              dark:bg-slate-950
              sm:p-8
            "
          >
            {/* =================================================
                GLOW
            ================================================= */}

            <div
              className="
                pointer-events-none
                absolute
                -right-20
                -top-20
                h-48
                w-48
                rounded-full
                bg-violet-500/20
                blur-3xl
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                -bottom-20
                -left-20
                h-48
                w-48
                rounded-full
                bg-fuchsia-500/10
                blur-3xl
              "
            />

            {/* =================================================
                ICON
            ================================================= */}

            <div
              className="
                relative
                mx-auto
                mb-5
                flex
                h-16
                w-16
                shrink-0
                items-center
                justify-center
              "
            >
              <div
                className="
                  absolute
                  inset-0
                  animate-ping
                  rounded-full
                  bg-violet-500/20
                "
              />

              <div
                className="
                  relative
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-violet-600
                  text-white
                  shadow-lg
                  shadow-violet-600/30
                "
              >
                <Loader2
                  size={28}
                  className="animate-spin"
                />
              </div>
            </div>

            {/* =================================================
                TITLE
            ================================================= */}

            <div className="relative shrink-0 text-center">
              <h2
                className="
                  text-xl
                  font-bold
                  text-slate-900
                  dark:text-white
                  sm:text-2xl
                "
              >
                Applying Edits
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Please wait while your image is being processed
              </p>
            </div>

            {/* =================================================
                EDIT LIST
            ================================================= */}

            {visibleItems > 0 && (
              <div
                ref={editListRef}
                className="
                  relative
                  mt-6
                  max-h-[270px]
                  min-h-0
                  shrink
                  overflow-y-auto
                  overscroll-contain
                  pr-1
                  space-y-2
                  scrollbar-thin
                  scrollbar-thumb-violet-500/40
                  scrollbar-track-transparent
                "
                style={{
                  touchAction: "pan-y",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {uniqueEdits
                  .slice(0, visibleItems)
                  .map((edit, index) => (
                    <div
                      key={`${edit}-${index}`}
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-slate-200/70
                        bg-slate-50
                        px-3.5
                        py-3
                        animate-[editIn_400ms_ease-out]
                        dark:border-white/10
                        dark:bg-white/[0.04]
                      "
                    >
                      <div
                        className="
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg
                          bg-emerald-500/15
                          text-emerald-500
                        "
                      >
                        <Check
                          size={16}
                          strokeWidth={3}
                        />
                      </div>

                      <span
                        className="
                          min-w-0
                          flex-1
                          text-sm
                          font-medium
                          text-slate-700
                          dark:text-slate-200
                        "
                      >
                        {edit}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* =================================================
                PROGRESS
            ================================================= */}

            <div className="relative mt-6 shrink-0">
              <div
                className="
                  h-1.5
                  overflow-hidden
                  rounded-full
                  bg-slate-200
                  dark:bg-white/10
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-violet-600
                    transition-all
                    duration-500
                    ease-out
                  "
                  style={{
                    width:
                      uniqueEdits.length
                        ? `${
                            (visibleItems /
                              uniqueEdits.length) *
                            100
                          }%`
                        : "0%",
                  }}
                />
              </div>

              <p
                className="
                  mt-2
                  text-center
                  text-[11px]
                  text-slate-400
                "
              >
                Processing your image...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  =========================================================
  COMPLETE UI
  =========================================================
  */

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        overflow-hidden
        overscroll-none
        bg-slate-950/70
        p-4
        backdrop-blur-xl
      "
      style={{
        touchAction: "none",
      }}
    >
      <div
        className="
          flex
          h-full
          items-center
          justify-center
          py-6
        "
      >
        <div
          className="
            relative
            flex
            max-h-[calc(100vh-3rem)]
            w-full
            max-w-md
            flex-col
            overflow-hidden
            rounded-[28px]
            border
            border-white/10
            bg-white
            p-6
            shadow-[0_30px_100px_rgba(0,0,0,0.45)]
            dark:bg-slate-950
            sm:p-8
          "
        >
          {/* =================================================
              GLOW
          ================================================= */}

          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-48
              w-48
              rounded-full
              bg-violet-500/20
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-20
              -left-20
              h-48
              w-48
              rounded-full
              bg-fuchsia-500/10
              blur-3xl
            "
          />

          {/* =================================================
              ICON
          ================================================= */}

          <div
            className="
              relative
              mx-auto
              mb-5
              flex
              h-16
              w-16
              shrink-0
              items-center
              justify-center
            "
          >
            <div
              className="
                absolute
                inset-0
                animate-ping
                rounded-full
                bg-violet-500/20
              "
            />

            <div
              className="
                relative
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                bg-violet-600
                text-white
                shadow-lg
                shadow-violet-600/30
              "
            >
              <Sparkles
                size={28}
                className="animate-pulse"
              />
            </div>
          </div>

          {/* =================================================
              TITLE
          ================================================= */}

          <div className="relative shrink-0 text-center">
            <h2
              className="
                text-xl
                font-bold
                text-slate-900
                dark:text-white
                sm:text-2xl
              "
            >
              Image Updated
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
                dark:text-slate-400
              "
            >
              Your changes have been applied
            </p>
          </div>

          {/* =================================================
              EDIT LIST
          ================================================= */}

          {uniqueEdits.length > 0 && (
            <div
              ref={editListRef}
              className="
                relative
                mt-6
                max-h-[240px]
                min-h-0
                shrink
                overflow-y-auto
                overscroll-contain
                pr-1
                space-y-2
                scrollbar-thin
                scrollbar-thumb-violet-500/40
                scrollbar-track-transparent
              "
              style={{
                touchAction: "pan-y",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {uniqueEdits
                .slice(0, visibleItems)
                .map((edit, index) => (
                  <div
                    key={`${edit}-${index}`}
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      border
                      border-slate-200/70
                      bg-slate-50
                      px-3.5
                      py-3
                      animate-[editIn_400ms_ease-out]
                      dark:border-white/10
                      dark:bg-white/[0.04]
                    "
                  >
                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-emerald-500/15
                        text-emerald-500
                      "
                    >
                      <Check
                        size={16}
                        strokeWidth={3}
                      />
                    </div>

                    <span
                      className="
                        min-w-0
                        flex-1
                        text-sm
                        font-medium
                        text-slate-700
                        dark:text-slate-200
                      "
                    >
                      {edit}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div className="relative mt-6 shrink-0">
            <div
              className="
                h-1.5
                overflow-hidden
                rounded-full
                bg-slate-200
                dark:bg-white/10
              "
            >
              <div
                className="
                  h-full
                  rounded-full
                  bg-violet-600
                  transition-all
                  duration-500
                  ease-out
                "
                style={{
                  width:
                    uniqueEdits.length
                      ? `${
                          (visibleItems /
                            uniqueEdits.length) *
                          100
                        }%`
                      : "100%",
                }}
              />
            </div>

            <p
              className="
                mt-2
                text-center
                text-[11px]
                text-slate-400
              "
            >
              Finalizing your image...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditCompleteOverlay;