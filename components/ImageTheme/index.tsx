import Image, { ImageProps } from "next/image";
import { useTheme } from "next-themes";
import { FunctionComponent, useEffect, useState } from "react";

interface ImageThemeProps extends Omit<ImageProps, "src"> {
  lightSrc: string;
  darkSrc: string;
}

const ImageTheme: FunctionComponent<ImageThemeProps> = ({
  lightSrc,
  darkSrc,
  alt,
  ...props
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Image
      src={resolvedTheme === "dark" ? darkSrc : lightSrc}
      alt={alt}
      {...props}
    />
  );
};

export default ImageTheme;
