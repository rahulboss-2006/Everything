import {
  useEffect,
  useMemo,
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
  const [visibleItems, setVisibleItems] =
    useState(0);

  const completedRef =
    useRef(false);

  const editListRef =
    useRef(null);

  const onCompleteRef =
    useRef(onComplete);

  /*
  =========================================================
  KEEP LATEST CALLBACK
  =========================================================
  */

  useEffect(() => {
    onCompleteRef.current =
      onComplete;
  }, [onComplete]);

  /*
  =========================================================
  NORMALIZE EDITS
  =========================================================
  */

  const uniqueEdits = useMemo(() => {
    if (!Array.isArray(edits)) {
      return [];
    }

    return Array.from(
      new Set(
        edits
          .filter(Boolean)
          .map((edit) =>
            String(edit).trim()
          )
          .filter(Boolean)
      )
    );
  }, [edits]);

  /*
  =========================================================
  STABLE EDIT SIGNATURE
  =========================================================
  */

  const editSignature =
    uniqueEdits.join("|");

  /*
  =========================================================
  LOCK PAGE SCROLL
  =========================================================
  */

  useEffect(() => {
    const body =
      document.body;

    const html =
      document.documentElement;

    const oldBodyOverflow =
      body.style.overflow;

    const oldHtmlOverflow =
      html.style.overflow;

    const oldBodyTouch =
      body.style.touchAction;

    const oldHtmlTouch =
      html.style.touchAction;

    body.style.overflow =
      "hidden";

    html.style.overflow =
      "hidden";

    body.style.touchAction =
      "none";

    html.style.touchAction =
      "none";

    return () => {
      body.style.overflow =
        oldBodyOverflow;

      html.style.overflow =
        oldHtmlOverflow;

      body.style.touchAction =
        oldBodyTouch;

      html.style.touchAction =
        oldHtmlTouch;
    };
  }, []);

  /*
  =========================================================
  AUTO SCROLL
  =========================================================
  */

  useEffect(() => {
    const container =
      editListRef.current;

    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTo({
        top:
          container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [visibleItems]);

  /*
  =========================================================
  PROGRESS
  =========================================================

  IMPORTANT:

  0 visible edits = 1%

  This prevents the progress bar from
  starting at 0%.

  Example with 4 edits:

  Start  = 1%
  Edit 1 = 25%
  Edit 2 = 50%
  Edit 3 = 75%
  Edit 4 = 100%
  =========================================================
  */

  const progress =
    uniqueEdits.length === 0
      ? 100
      : visibleItems === 0
        ? 1
        : Math.min(
            100,
            Math.round(
              (visibleItems /
                uniqueEdits.length) *
                100
            )
          );

  /*
  =========================================================
  PROGRESSIVE ANIMATION
  =========================================================
  */

  useEffect(() => {
    completedRef.current =
      false;

    /*
    -------------------------------------------------------
    PROCESSING MODE
    -------------------------------------------------------
    */

    if (processing) {
      setVisibleItems(0);
      return;
    }

    /*
    -------------------------------------------------------
    RESET
    -------------------------------------------------------
    */

    setVisibleItems(0);

    const total =
      uniqueEdits.length;

    const timers = [];

    /*
    -------------------------------------------------------
    NO EDITS
    -------------------------------------------------------
    */

    if (total === 0) {
      const timer =
        setTimeout(() => {
          if (
            completedRef.current
          ) {
            return;
          }

          completedRef.current =
            true;

          onCompleteRef
            .current?.();
        }, 1800);

      timers.push(timer);

      return () => {
        timers.forEach(
          clearTimeout
        );
      };
    }

    /*
    -------------------------------------------------------
    SHOW EACH EDIT
    -------------------------------------------------------

    Start:
      1%

    Edit 1:
      25% for 4 edits

    Edit 2:
      50%

    Edit 3:
      75%

    Edit 4:
      100%

    First edit appears after 400ms.
    Every next edit appears 500ms later.
    -------------------------------------------------------
    */

    uniqueEdits.forEach(
      (_, index) => {
        const timer =
          setTimeout(
            () => {
              setVisibleItems(
                index + 1
              );
            },
            400 +
              index * 500
          );

        timers.push(timer);
      }
    );

    /*
    -------------------------------------------------------
    COMPLETE
    -------------------------------------------------------

    Wait until the final edit has appeared,
    then keep 100% visible for 1.5 seconds.
    -------------------------------------------------------
    */

    const completeDelay =
      400 +
      (total - 1) * 500 +
      1500;

    const completeTimer =
      setTimeout(() => {
        if (
          completedRef.current
        ) {
          return;
        }

        completedRef.current =
          true;

        onCompleteRef
          .current?.();
      }, completeDelay);

    timers.push(
      completeTimer
    );

    /*
    -------------------------------------------------------
    CLEANUP
    -------------------------------------------------------
    */

    return () => {
      timers.forEach(
        clearTimeout
      );
    };
  }, [
    editSignature,
    processing,
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
          flex
          items-center
          justify-center
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
            relative
            flex
            max-h-[calc(100vh-2rem)]
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

          <div
            className="
              relative
              shrink-0
              text-center
            "
          >
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
              Please wait while your image
              is being processed
            </p>
          </div>

          {uniqueEdits.length > 0 && (
            <div
              ref={editListRef}
              className="
                relative
                mt-6
                max-h-[270px]
                min-h-0
                shrink
                space-y-2
                overflow-y-auto
                overscroll-contain
                pr-1
                scrollbar-thin
                scrollbar-thumb-violet-500/40
                scrollbar-track-transparent
              "
              style={{
                touchAction: "pan-y",
                WebkitOverflowScrolling:
                  "touch",
              }}
            >
              {uniqueEdits
                .slice(
                  0,
                  visibleItems
                )
                .map(
                  (
                    edit,
                    index
                  ) => (
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
                  )
                )}
            </div>
          )}

          <div
            className="
              relative
              mt-6
              shrink-0
            "
          >
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
                  transition-[width]
                  duration-500
                  ease-out
                "
                style={{
                  width: `${progress}%`,
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
              {uniqueEdits.length > 0
                ? `${visibleItems} of ${uniqueEdits.length} changes completed`
                : "Processing your image..."}
            </p>
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
        flex
        items-center
        justify-center
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
          relative
          flex
          max-h-[calc(100vh-2rem)]
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

        {/* SUCCESS ICON */}

        <div
          className="
            relative
            mx-auto
            mb-5
            flex
            h-20
            w-20
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
              bg-emerald-500/15
            "
          />

          <div
            className="
              relative
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-2xl
              bg-emerald-500
              text-white
              shadow-lg
              shadow-emerald-500/30
            "
          >
            <Check
              size={38}
              strokeWidth={3}
            />
          </div>
        </div>

        {/* TITLE */}

        <div
          className="
            relative
            shrink-0
            text-center
          "
        >
          <h2
            className="
              text-2xl
              font-bold
              text-slate-900
              dark:text-white
              sm:text-3xl
            "
          >
            Image Updated
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            Your changes have been
            applied successfully
          </p>
        </div>

        {/* EDIT LIST */}

        {uniqueEdits.length > 0 && (
          <div
            ref={editListRef}
            className="
              relative
              mt-6
              max-h-[240px]
              min-h-0
              shrink
              space-y-2
              overflow-y-auto
              overscroll-contain
              pr-1
              scrollbar-thin
              scrollbar-thumb-emerald-500/40
              scrollbar-track-transparent
            "
            style={{
              touchAction: "pan-y",
              WebkitOverflowScrolling:
                "touch",
            }}
          >
            {uniqueEdits
              .slice(
                0,
                visibleItems
              )
              .map(
                (
                  edit,
                  index
                ) => (
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
                )
              )}
          </div>
        )}

        {/* PROGRESS */}

        <div
          className="
            relative
            mt-6
            shrink-0
          "
        >
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
                bg-emerald-500
                transition-[width]
                duration-500
                ease-out
              "
              style={{
                width:
                  uniqueEdits.length > 0
                    ? `${progress}%`
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
            {uniqueEdits.length > 0
              ? `${visibleItems} of ${uniqueEdits.length} changes completed`
              : "Changes completed"}
          </p>
        </div>

        {/* BADGE */}

        <div
          className="
            relative
            mx-auto
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-emerald-500/20
            bg-emerald-500/10
            px-4
            py-2
            text-xs
            font-semibold
            text-emerald-600
            dark:text-emerald-400
          "
        >
          <Sparkles size={14} />

          <span>
            Edit complete
          </span>
        </div>
      </div>
    </div>
  );
}

export default EditCompleteOverlay;