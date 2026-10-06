import React, { useState } from "react";
import { ImageOff } from "lucide-react";

/** An <img> that shows a neutral placeholder instead of a broken-image icon when the URL fails. */
const SmartImage = ({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-400 ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
};

export default SmartImage;
