import React from "react";
import { Star } from "lucide-react";

type Props = {
  value: number;
  size?: number;
  /** When given, the stars become buttons that call this with 1 to 5. */
  onChange?: (value: number) => void;
};

/** Five stars, filled up to the value. Clickable when {@code onChange} is passed. */
const StarRating = ({ value, size = 16, onChange }: Props) => (
  <span className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => {
      const filled = value >= i - 0.25;
      const icon = (
        <Star
          style={{ width: size, height: size }}
          className={filled ? "fill-amber-400 text-amber-400" : value > i - 1 ? "fill-amber-200 text-amber-300" : "fill-transparent text-slate-300"}
        />
      );
      return onChange ? (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`} className="rounded p-0.5 hover:scale-110">
          {icon}
        </button>
      ) : (
        <span key={i}>{icon}</span>
      );
    })}
  </span>
);

export default StarRating;
