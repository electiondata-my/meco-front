import { useEffect, useRef, useState } from "react";

/**
 * Party / coalition flag. The single source of truth for flag dimensions site-wide.
 * Renders a 32x16 box with a "?" placeholder behind the image, shown when the
 * image is missing, still loading, or fails to load.
 */
export function PartyFlag({
  uid,
  name,
  folder = "parties",
}: {
  uid?: string;
  name: string;
  folder?: "parties" | "coalitions";
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current?.complete) {
      imgRef.current.naturalWidth === 0 ? setFailed(true) : setLoaded(true);
    }
  }, []);

  return (
    <span className="relative flex h-4 w-8 shrink-0 items-center justify-center outline outline-1 outline-otl-gray-200 text-xs text-txt-black-400">
      ?
      {uid && !failed && (
        <img
          ref={imgRef}
          src={`/static/images/${folder}/${uid}.png`}
          alt={name}
          width={32}
          height={16}
          className={`absolute inset-0 h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export default PartyFlag;
