import { RefObject, useEffect, useState } from "react";

/**
 * Simple hook which return whether the element is focused or not
 * @param ref - the element being referenced
 */
const useFocus = (ref: RefObject<HTMLElement | null>) => {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    node.addEventListener("focus", onFocus);
    node.addEventListener("blur", onBlur);

    return () => {
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("blur", onBlur);
    };
  }, [ref]);

  return { focused };
};

export default useFocus;
