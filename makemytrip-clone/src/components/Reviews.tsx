import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { BadgeCheck, Camera, Flag, ImagePlus, Loader2, MessageSquare, Pencil, ThumbsUp, Trash2, X } from "lucide-react";
import { deleteReview, flagReview, getFlagReasons, getReviews, replyToReview, saveReview, voteHelpful } from "@/api";
import SignupDialog from "@/components/SignupDialog";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, formatDate } from "@/lib/format";

type Props = {
  category: string;
  itemId: string;
  itemName?: string;
  className?: string;
};

const SORTS = [
  { value: "helpful", label: "Most helpful" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const MAX_PHOTOS = 3;

/** Shrinks a picked image to a small JPEG so reviews stay light to store and quick to load. */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a picture we can use"));
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process that picture"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

const when = (iso?: string) => (iso ? formatDate(iso) : "");

/** Ratings summary, the review list with sorting, and everything a customer can do with a review. */
const Reviews = ({ category, itemId, itemName, className = "" }: Props) => {
  const user = useSelector((state: any) => state.user.user);
  const [sort, setSort] = useState("helpful");
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState(false);
  const [photoView, setPhotoView] = useState<string | null>(null);
  const [flagTarget, setFlagTarget] = useState<any>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(
    async (pageToLoad = 0, replace = true) => {
      setLoading(true);
      try {
        const res = await getReviews(category, itemId, sort, pageToLoad, user?.id);
        setData(res);
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setPage(pageToLoad);
        setError("");
      } catch (e) {
        setError(errorMessage(e, "Could not load reviews."));
      } finally {
        setLoading(false);
      }
    },
    [category, itemId, sort, user?.id]
  );

  useEffect(() => {
    if (itemId) load(0, true);
  }, [load, itemId]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const summary = data?.summary;
  const mine = data?.mine;
  const patch = (id: string, fn: (v: any) => any) => setItems((list) => list.map((v) => (v.review.id === id ? fn(v) : v)));

  const vote = async (v: any) => {
    if (!user) return;
    try {
      const res = await voteHelpful(user.id, v.review.id);
      patch(v.review.id, (x) => ({ ...x, helpfulByMe: res.helpfulByMe, review: { ...x.review, helpfulCount: res.helpfulCount } }));
    } catch (e) {
      setNotice(errorMessage(e, "Could not save your vote."));
    }
  };

  const remove = async (v: any) => {
    if (!user || !window.confirm("Delete your review?")) return;
    try {
      await deleteReview(user.id, v.review.id);
      setNotice("Your review was deleted.");
      load(0, true);
    } catch (e) {
      setNotice(errorMessage(e, "Could not delete the review."));
    }
  };

  return (
    <section id="reviews" className={`scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-blue-900/5 sm:p-8 ${className}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center text-lg font-bold">
          <MessageSquare className="mr-2 h-5 w-5 text-blue-600" />
          Ratings &amp; reviews
        </h2>
        {user ? (
          <Button onClick={() => setWriting(true)} className="bg-blue-600 text-white hover:bg-blue-700">
            <Pencil className="mr-1.5 h-4 w-4" /> {mine ? "Edit your review" : "Write a review"}
          </Button>
        ) : (
          <SignupDialog trigger={<Button variant="outline">Log in to write a review</Button>} />
        )}
      </div>

      {notice && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {summary && summary.count > 0 && (
        <div className="mb-6 grid gap-6 sm:grid-cols-[180px_1fr]">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-extrabold text-slate-900">{summary.average.toFixed(1)}</div>
            <div className="mt-1 flex justify-center sm:justify-start">
              <StarRating value={summary.average} size={18} />
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {summary.count} review{summary.count > 1 ? "s" : ""}
              {summary.withPhotos > 0 ? ` · ${summary.withPhotos} with photos` : ""}
            </div>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const n = summary.distribution?.[String(s)] || 0;
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="w-10 shrink-0 text-slate-600">{s} star</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(n / summary.count) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-slate-500">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {summary && summary.count === 0 && !loading && (
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">No reviews yet</p>
          <p className="mt-1 text-sm text-slate-500">Be the first to share what it was like{itemName ? ` at ${itemName}` : ""}.</p>
        </div>
      )}

      {summary && summary.count > 1 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <span className="text-sm text-slate-500">Sort by</span>
          <div className="flex flex-wrap gap-1.5">
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  sort === s.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((v) => (
          <ReviewCard
            key={v.review.id}
            v={v}
            user={user}
            onVote={() => vote(v)}
            onDelete={() => remove(v)}
            onEdit={() => setWriting(true)}
            onFlag={() => setFlagTarget(v)}
            onPhoto={setPhotoView}
            onReplied={(review) => patch(v.review.id, (x) => ({ ...x, review }))}
          />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      )}
      {data?.hasMore && !loading && (
        <div className="mt-5 text-center">
          <Button variant="outline" onClick={() => load(page + 1, false)}>
            Show more reviews
          </Button>
        </div>
      )}

      <WriteDialog
        open={writing}
        onClose={() => setWriting(false)}
        existing={mine?.review}
        category={category}
        itemId={itemId}
        itemName={itemName}
        userId={user?.id}
        onSaved={() => {
          setWriting(false);
          setNotice(mine ? "Your review was updated." : "Thanks! Your review is live.");
          setSort("newest");
          load(0, true);
        }}
      />

      <FlagDialog
        target={flagTarget}
        userId={user?.id}
        onClose={() => setFlagTarget(null)}
        onDone={(hidden) => {
          setFlagTarget(null);
          setNotice(hidden ? "Thanks. That review has been hidden while our team checks it." : "Thanks for letting us know. Our team will take a look.");
          if (flagTarget) patch(flagTarget.review.id, (x) => ({ ...x, flaggedByMe: true }));
          if (hidden) load(0, true);
        }}
      />

      <Dialog open={!!photoView} onOpenChange={(o) => !o && setPhotoView(null)}>
        <DialogContent className="bg-white p-2 sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Review photo</DialogTitle>
            <DialogDescription>A photo shared by a reviewer</DialogDescription>
          </DialogHeader>
          {photoView && <img src={photoView} alt="Review" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

// ---------------------------------------------------------------------- one review

const ReviewCard = ({
  v,
  user,
  onVote,
  onDelete,
  onEdit,
  onFlag,
  onPhoto,
  onReplied,
}: {
  v: any;
  user: any;
  onVote: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onFlag: () => void;
  onPhoto: (src: string) => void;
  onReplied: (review: any) => void;
}) => {
  const r = v.review;
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const replies: any[] = r.replies || [];

  const sendReply = async () => {
    if (!user || !text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await replyToReview(user.id, r.id, text);
      onReplied(updated);
      setText("");
      setReplying(false);
      setShowReplies(true);
    } catch (e) {
      setErr(errorMessage(e, "Could not post your reply."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`rounded-xl border p-4 ${v.mine ? "border-blue-200 bg-blue-50/40" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white">
          {(r.userName || "T").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold">{r.userName}</span>
            {v.mine && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Your review</span>}
            {r.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified booking
              </span>
            )}
            <span className="text-xs text-slate-400">{when(r.createdAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StarRating value={r.rating} size={15} />
            {r.title && <span className="font-medium text-slate-800">{r.title}</span>}
          </div>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700">{r.text}</p>

          {r.photos?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {r.photos.map((p: string, i: number) => (
                <button key={i} type="button" onClick={() => onPhoto(p)} className="overflow-hidden rounded-lg border">
                  <img src={p} alt={`Review photo ${i + 1}`} className="h-20 w-20 object-cover transition-transform hover:scale-105" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <button
              type="button"
              onClick={onVote}
              disabled={!user || v.mine}
              title={!user ? "Log in to vote" : v.mine ? "You cannot vote on your own review" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                v.helpfulByMe ? "border-blue-600 bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              }`}
            >
              <ThumbsUp className={`h-4 w-4 ${v.helpfulByMe ? "fill-blue-600" : ""}`} /> Helpful ({r.helpfulCount})
            </button>
            {user && (
              <button type="button" onClick={() => setReplying((x) => !x)} className="inline-flex items-center gap-1 hover:text-slate-800">
                <MessageSquare className="h-4 w-4" /> Reply
              </button>
            )}
            {replies.length > 0 && (
              <button type="button" onClick={() => setShowReplies((x) => !x)} className="hover:text-slate-800">
                {showReplies ? "Hide" : "View"} {replies.length} repl{replies.length > 1 ? "ies" : "y"}
              </button>
            )}
            {v.mine && (
              <>
                <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 hover:text-slate-800">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 hover:text-red-600">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            )}
            {user && !v.mine && (
              <button
                type="button"
                onClick={onFlag}
                disabled={v.flaggedByMe}
                className="ml-auto inline-flex items-center gap-1 hover:text-red-600 disabled:cursor-default disabled:opacity-60 disabled:hover:text-slate-500"
              >
                <Flag className="h-4 w-4" /> {v.flaggedByMe ? "Reported" : "Report"}
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 600))}
                rows={2}
                placeholder="Write a reply..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={sendReply} disabled={busy || !text.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
                  {busy ? "Posting..." : "Post reply"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showReplies && replies.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
              {replies.map((rep) => (
                <div key={rep.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{rep.userName}</span>
                    {rep.role === "ADMIN" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Official</span>}
                    <span className="text-xs text-slate-400">{when(rep.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-slate-700">{rep.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------- write / edit

const WriteDialog = ({
  open,
  onClose,
  existing,
  category,
  itemId,
  itemName,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  existing?: any;
  category: string;
  itemId: string;
  itemName?: string;
  userId?: string;
  onSaved: () => void;
}) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating || 0);
    setTitle(existing?.title || "");
    setText(existing?.text || "");
    setPhotos(existing?.photos || []);
    setError("");
  }, [open, existing]);

  const pick = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    const room = MAX_PHOTOS - photos.length;
    try {
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, room)) {
        if (!f.type.startsWith("image/")) throw new Error("Please choose picture files only");
        added.push(await compressImage(f));
      }
      setPhotos((p) => [...p, ...added]);
      if (files.length > room) setError(`You can attach up to ${MAX_PHOTOS} photos.`);
    } catch (e: any) {
      setError(e?.message || "Could not add that photo");
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  const submit = async () => {
    if (!userId) return;
    if (rating < 1) return setError("Please choose a star rating.");
    if (text.trim().length < 10) return setError("Please write at least a sentence about your experience.");
    setBusy(true);
    setError("");
    try {
      await saveReview({ userId, category, itemId, rating, title, text, photos });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, "Could not save your review."));
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : "Write a review"}</DialogTitle>
          <DialogDescription>{itemName || "Share your experience to help other travellers"}</DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-1 text-sm font-medium">
            Your rating <span className="text-red-600">*</span>
          </div>
          <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
            <span onMouseOver={(e) => {
              const b = (e.target as HTMLElement).closest("button[aria-label]");
              const n = b ? parseInt(b.getAttribute("aria-label") || "0", 10) : 0;
              if (n) setHover(n);
            }}>
              <StarRating value={shown} size={32} onChange={setRating} />
            </span>
            <span className="text-sm font-medium text-slate-600">{LABELS[shown] || "Tap a star"}</span>
          </div>
        </div>

        <div>
          <label htmlFor="rv-title" className="mb-1 block text-sm font-medium">
            Title <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="rv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Sum it up in a few words"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="rv-text" className="mb-1 block text-sm font-medium">
            Your review <span className="text-red-600">*</span>
          </label>
          <textarea
            id="rv-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1500))}
            rows={5}
            placeholder="What did you like or dislike? How were the staff, cleanliness, location and value?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-0.5 text-right text-xs text-slate-400">{text.length}/1500</div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <Camera className="h-4 w-4" /> Photos <span className="font-normal text-slate-400">(optional, up to {MAX_PHOTOS})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg border object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => file.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
              >
                <ImagePlus className="h-5 w-5" /> Add photo
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 text-white hover:bg-blue-700" onClick={submit} disabled={busy}>
            {busy ? "Saving..." : existing ? "Update review" : "Submit review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------- report

const FlagDialog = ({ target, userId, onClose, onDone }: { target: any; userId?: string; onClose: () => void; onDone: (hidden: boolean) => void }) => {
  const [reasons, setReasons] = useState<string[]>(["Spam or fake", "Offensive language", "Not about this item", "Personal information", "Other"]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getFlagReasons()
      .then((r) => r?.length && setReasons(r))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setReason("");
    setError("");
  }, [target]);

  const submit = async () => {
    if (!userId || !target) return;
    if (!reason) return setError("Please choose a reason.");
    setBusy(true);
    try {
      const res = await flagReview(userId, target.review.id, reason);
      onDone(!!res.hidden);
    } catch (e) {
      setError(errorMessage(e, "Could not send your report."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>Tell us what is wrong. Reviews reported by several people are hidden until our team checks them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {reasons.map((r) => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${reason === r ? "border-blue-600 bg-blue-50" : "hover:bg-slate-50"}`}>
              <input type="radio" name="flag-reason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={submit} disabled={busy}>
            {busy ? "Sending..." : "Send report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Reviews;
