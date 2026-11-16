import { useRef, useState, type RefObject } from "react";
import { TypingText } from "@/components/TypingText";
import type { CaretStyle, DrillMode } from "@/lib/drillSettings";

const BLOCKED_INPUT_TYPES = new Set([
  "insertFromPaste",
  "insertFromPasteAsQuotation",
  "insertFromDrop",
  "deleteByCut",
  "insertFromYank",
]);

const ALLOWED_BULK_INPUT_TYPES = new Set([
  "insertCompositionText",
  "insertFromComposition",
  "insertReplacementText",
  "insertText",
  "deleteContentBackward",
  "deleteWordBackward",
  "deleteSoftLineBackward",
  "deleteHardLineBackward",
]);

interface TypingAreaProps {
  inputRef: RefObject<HTMLInputElement | null>;
  text: string;
  typed: string;
  caretStyle: CaretStyle;
  drillMode: DrillMode;
  quoteAuthor: string | null;
  finished: boolean;
  focused: boolean;
  errorFlash: boolean;
  isRecord: boolean;
  finalWpm: number;
  finalAccuracy: number;
  onFocusChange: (focused: boolean) => void;
  onInputChange: (prevValue: string, nextValue: string) => void;
}

export function TypingArea({
  inputRef,
  text,
  typed,
  caretStyle,
  drillMode,
  quoteAuthor,
  finished,
  focused,
  errorFlash,
  isRecord,
  finalWpm,
  finalAccuracy,
  onFocusChange,
  onInputChange,
}: TypingAreaProps) {
  const [composingValue, setComposingValue] = useState<string | null>(null);
  const composingRef = useRef(false);
  const lastTrustedBeforeInputRef = useRef<{ inputType: string; at: number } | null>(null);
  const lastCompositionEndAtRef = useRef(0);

  return (
    <section
      className={`panel relative mt-3 p-4 transition-shadow sm:p-8 ${
        !finished ? "cursor-text" : ""
      } ${errorFlash ? "shake" : ""} ${isRecord ? "record-glow" : ""}`}
      onClick={() => {
        if (!finished) inputRef.current?.focus();
      }}
    >
      <div
        className={
          !focused && !finished
            ? "blur-[3px] transition-[filter]"
            : finished
              ? "opacity-60 transition-opacity"
              : "transition-[filter]"
        }
      >
        <TypingText text={text} typed={typed} caretStyle={caretStyle} />
        {drillMode === "quote" && quoteAuthor ? (
          <p className="mt-3 text-right font-sans text-xs italic text-muted-foreground">
            — {quoteAuthor}
          </p>
        ) : null}
      </div>

      {!finished ? (
        <input
          ref={inputRef}
          type="text"
          name="typing_practice_input"
          id="typing_practice_input"
          data-form-type="other"
          data-lpignore="true"
          data-protonpass-ignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          value={composingValue ?? typed}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label="Typing input"
          onBeforeInput={(e) => {
            const native = e.nativeEvent as InputEvent;
            const inputType = native.inputType ?? "";
            if (BLOCKED_INPUT_TYPES.has(inputType)) {
              e.preventDefault();
              return;
            }
            if (e.nativeEvent.isTrusted) {
              lastTrustedBeforeInputRef.current = { inputType, at: performance.now() };
            }
          }}
          onCompositionStart={(e) => {
            composingRef.current = true;
            setComposingValue(e.currentTarget.value);
          }}
          onCompositionUpdate={(e) => {
            setComposingValue(e.currentTarget.value);
          }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            lastCompositionEndAtRef.current = performance.now();
            setComposingValue(null);
            onInputChange(typed, e.currentTarget.value);
          }}
          onChange={(e) => {
            const native = e.nativeEvent as InputEvent & { isComposing?: boolean };
            if (composingRef.current || native.isComposing) {
              setComposingValue(e.target.value);
              return;
            }

            const nextVal = e.target.value;
            const addedCount = nextVal.length - typed.length;
            if (addedCount > 1) {
              const now = performance.now();
              const recentInput = lastTrustedBeforeInputRef.current;
              const trustedBulk =
                (recentInput !== null &&
                  now - recentInput.at < 150 &&
                  ALLOWED_BULK_INPUT_TYPES.has(recentInput.inputType)) ||
                now - lastCompositionEndAtRef.current < 150;

              if (!trustedBulk) {
                e.target.value = typed;
                return;
              }
            }

            onInputChange(typed, nextVal);
          }}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && ["v", "x"].includes(e.key.toLowerCase())) {
              e.preventDefault();
            } else if (e.shiftKey && e.key === "Insert") {
              e.preventDefault();
            }
          }}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      ) : null}

      <p aria-live="polite" className="sr-only">
        {finished
          ? `Run complete. ${finalWpm.toFixed(0)} words per minute, ${finalAccuracy.toFixed(0)} percent accuracy.`
          : ""}
      </p>

      {!focused && !finished ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-secondary/90 px-4 py-2 text-sm text-muted-foreground">
            Click here or press any key to focus
          </span>
        </div>
      ) : null}
    </section>
  );
}
