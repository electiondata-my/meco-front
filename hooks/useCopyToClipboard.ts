import * as React from "react";

type CopyFn = (text: string) => Promise<boolean>;

interface UseCopyToClipboardReturn {
  copy: CopyFn;
  isCopied: boolean;
  copiedValue: string | null;
}

export function useCopyToClipboard(delay = 2000): UseCopyToClipboardReturn {
  const [copiedValue, setCopiedValue] = React.useState<string | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy: CopyFn = React.useCallback(
    async (text) => {
      if (!navigator?.clipboard) {
        console.warn("Clipboard not supported");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedValue(text);
        setIsCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsCopied(false), delay);
        return true;
      } catch (error) {
        console.warn("Copy failed", error);
        return false;
      }
    },
    [delay],
  );

  return { copy, isCopied, copiedValue };
}
