import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { recordActivity } from "@/api";

/**
 * Tells the server that the logged-in customer opened this item, so "Recommended for you" can learn from it.
 * Does nothing for guests. A visit that came from a recommendation is marked as such.
 */
export const useTrackView = (category: string, itemId?: string | null) => {
  const router = useRouter();
  const userId = useSelector((state: any) => state.user.user?.id);
  const fromRecommendation = router.query.ref === "rec";

  useEffect(() => {
    if (!userId || !itemId) return;
    recordActivity(userId, "VIEW", { category, itemId, source: fromRecommendation ? "recommendation" : undefined });
  }, [userId, category, itemId, fromRecommendation]);
};
