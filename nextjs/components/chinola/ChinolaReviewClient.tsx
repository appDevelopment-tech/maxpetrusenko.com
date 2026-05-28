"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";

type ReviewLabel = "passion_fruit" | "not_fruit" | "unsure";

type FarmImage = {
  id: string;
  album: string;
  src: string;
  thumb: string;
  draftBoxes?: ReviewBox[];
};

type Manifest = {
  token: string;
  title: string;
  sources: string[];
  images: FarmImage[];
};

type ReviewBox = {
  id: string;
  label: ReviewLabel;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageReview = {
  imageId: string;
  boxes: ReviewBox[];
  reviewed: boolean;
  note?: string;
};

type ReviewState = Record<string, ImageReview>;

const LABELS: Array<{ value: ReviewLabel; label: string }> = [
  { value: "passion_fruit", label: "Passion fruit" },
  { value: "not_fruit", label: "Not fruit" },
  { value: "unsure", label: "Unsure" },
];

function emptyReview(imageId: string): ImageReview {
  return { imageId, boxes: [], reviewed: false };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function normalizeBox(startX: number, startY: number, endX: number, endY: number) {
  const x = clamp(Math.min(startX, endX));
  const y = clamp(Math.min(startY, endY));
  const width = clamp(Math.abs(endX - startX));
  const height = clamp(Math.abs(endY - startY));
  return { x, y, width, height };
}

export function ChinolaReviewClient({ token }: { token: string }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reviews, setReviews] = useState<ReviewState>({});
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<ReviewLabel>("passion_fruit");
  const [draftBox, setDraftBox] = useState<ReviewBox | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [status, setStatus] = useState("Loading farm images.");
  const [saving, setSaving] = useState(false);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const images = useMemo(() => manifest?.images ?? [], [manifest]);
  const activeImage = images[activeIndex];
  const activeReview = activeImage
    ? reviews[activeImage.id] ?? emptyReview(activeImage.id)
    : null;

  const reviewedCount = useMemo(
    () => images.filter((image) => reviews[image.id]?.reviewed).length,
    [images, reviews]
  );
  const boxCount = useMemo(
    () =>
      Object.values(reviews).reduce(
        (total, review) => total + review.boxes.filter((box) => box.label === "passion_fruit").length,
        0
      ),
    [reviews]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      const response = await fetch("/chinola/review/farm-images.json");
      const data = (await response.json()) as Manifest;

      if (cancelled) return;
      setManifest(data);

      const localRaw = window.localStorage.getItem(`chinola-review:${token}`);
      if (localRaw) {
        setReviews(JSON.parse(localRaw) as ReviewState);
        setStatus("Loaded saved browser progress.");
      } else {
        const serverResponse = await fetch(`/api/chinola/review?token=${encodeURIComponent(token)}`);
        const serverData = await serverResponse.json();
        if (serverData?.review?.images) {
          const nextReviews: ReviewState = {};
          for (const image of serverData.review.images as ImageReview[]) {
            nextReviews[image.imageId] = image;
          }
          setReviews(nextReviews);
          setStatus("Loaded saved server progress.");
      } else {
        const seededReviews: ReviewState = {};
        for (const image of data.images) {
          if (image.draftBoxes?.length) {
            seededReviews[image.id] = {
              imageId: image.id,
              boxes: image.draftBoxes,
              reviewed: false,
            };
          }
        }
        if (Object.keys(seededReviews).length) {
          setReviews(seededReviews);
        }
        setStatus("Draw boxes around visible passion fruit. Mark unclear images as reviewed with no boxes.");
      }
      }
    }

    loadManifest().catch(() => setStatus("Could not load farm image manifest."));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (manifest) {
      window.localStorage.setItem(`chinola-review:${token}`, JSON.stringify(reviews));
    }
  }, [manifest, reviews, token]);

  function getPoint(event: PointerEvent<HTMLDivElement>) {
    const rect = imageFrameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  }

  function updateActiveReview(updater: (review: ImageReview) => ImageReview) {
    if (!activeImage) return;
    setReviews((current) => ({
      ...current,
      [activeImage.id]: updater(current[activeImage.id] ?? emptyReview(activeImage.id)),
    }));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).dataset.boxId) return;
    const point = getPoint(event);
    if (!point) return;
    setSelectedBoxId(null);
    setDrawStart(point);
    setDraftBox({
      id: `box-${Date.now()}`,
      label: activeLabel,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drawStart || !draftBox) return;
    const point = getPoint(event);
    if (!point) return;
    setDraftBox({
      ...draftBox,
      ...normalizeBox(drawStart.x, drawStart.y, point.x, point.y),
    });
  }

  function handlePointerUp() {
    if (!draftBox) return;

    if (draftBox.width > 0.01 && draftBox.height > 0.01) {
      updateActiveReview((review) => ({
        ...review,
        boxes: [...review.boxes, draftBox],
        reviewed: true,
      }));
      setSelectedBoxId(draftBox.id);
      setStatus("Box added. Save progress when this image looks right.");
    }

    setDraftBox(null);
    setDrawStart(null);
  }

  function setCurrentReviewed(reviewed: boolean) {
    updateActiveReview((review) => ({ ...review, reviewed }));
    setStatus(reviewed ? "Image marked reviewed." : "Image marked not reviewed.");
  }

  function deleteSelectedBox() {
    if (!selectedBoxId) return;
    updateActiveReview((review) => ({
      ...review,
      boxes: review.boxes.filter((box) => box.id !== selectedBoxId),
    }));
    setSelectedBoxId(null);
  }

  function clearBoxes() {
    updateActiveReview((review) => ({ ...review, boxes: [], reviewed: true }));
    setSelectedBoxId(null);
    setStatus("Boxes cleared. This image is marked reviewed with no fruit boxes.");
  }

  function updateSelectedLabel(label: ReviewLabel) {
    setActiveLabel(label);
    if (!selectedBoxId) return;
    updateActiveReview((review) => ({
      ...review,
      boxes: review.boxes.map((box) => (box.id === selectedBoxId ? { ...box, label } : box)),
    }));
  }

  function buildPayload(complete = false) {
    return {
      token,
      reviewer: reviewer.trim() || undefined,
      complete,
      images: images.map((image) => reviews[image.id] ?? emptyReview(image.id)),
    };
  }

  async function saveProgress(complete = false) {
    if (complete && reviewedCount !== images.length) {
      setStatus(`Review all ${images.length} images before final submit.`);
      return;
    }

    setSaving(true);
    setStatus(complete ? "Submitting final review." : "Saving progress.");

    try {
      const response = await fetch("/api/chinola/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload(complete)),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setStatus(
        complete
          ? `Submitted. ${data.reviewedCount} images reviewed, ${data.boxCount} passion fruit boxes ready for training.`
          : `Saved. ${data.reviewedCount} images reviewed, ${data.boxCount} passion fruit boxes.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function move(delta: number) {
    setActiveIndex((current) => Math.max(0, Math.min(images.length - 1, current + delta)));
    setSelectedBoxId(null);
  }

  if (!manifest || !activeImage || !activeReview) {
    return (
      <section className="mx-auto max-w-[980px] px-4 py-10">
        <p className="text-sm font-semibold text-[var(--muted)]">{status}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1380px] px-3 pb-12 pt-4 md:px-5">
      <div className="mb-4 grid gap-3 rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-white/78 p-4 shadow-[0_16px_50px_rgba(12,17,21,0.08)] md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--accent-spirit)]">
            Chinola training review
          </p>
          <h1 className="mt-1 font-serif text-[clamp(1.9rem,4vw,3.25rem)] font-bold leading-[1.02] text-[var(--ink)]">
            Mark visible passion fruit
          </h1>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--ink-soft)] md:text-base">
            Draw tight boxes around actual passion fruit. If an image is unclear or has no visible fruit,
            mark it reviewed with no boxes. Submit final review when all images are checked.
          </p>
        </div>
        <div className="grid gap-2 text-sm md:min-w-[280px]">
          <input
            className="rounded-[8px] border border-[rgba(12,17,21,0.14)] bg-white px-3 py-2"
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Reviewer name"
            value={reviewer}
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn secondary" disabled={saving} onClick={() => saveProgress(false)} type="button">
              Save progress
            </button>
            <button className="btn primary" disabled={saving} onClick={() => saveProgress(true)} type="button">
              Submit final
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        <aside className="max-h-[72vh] overflow-auto rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-white/78 p-2">
          <div className="px-2 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            {reviewedCount}/{images.length} reviewed
          </div>
          <div className="grid gap-2">
            {images.map((image, imageIndex) => {
              const review = reviews[image.id] ?? emptyReview(image.id);
              return (
                <button
                  className={`grid grid-cols-[54px_1fr] items-center gap-2 rounded-[8px] border p-2 text-left text-xs ${
                    imageIndex === activeIndex
                      ? "border-[var(--accent-spirit)] bg-[rgba(14,97,93,0.1)]"
                      : "border-[rgba(12,17,21,0.08)] bg-white/60"
                  }`}
                  key={image.id}
                  onClick={() => {
                    setActiveIndex(imageIndex);
                    setSelectedBoxId(null);
                  }}
                  type="button"
                >
                  <img alt="" className="h-12 w-12 rounded-[6px] object-cover" src={image.thumb} />
                  <span>
                    <strong className="block text-[var(--ink)]">{image.id}</strong>
                    <span className="text-[var(--muted)]">
                      {review.reviewed ? "reviewed" : "open"} · {review.boxes.length} boxes
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-[#08100e] p-3 shadow-[0_18px_60px_rgba(12,17,21,0.16)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white">
            <span className="font-semibold">{activeImage.id}</span>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-[8px] bg-white/10 px-3 py-2" onClick={() => move(-1)} type="button">
                Prev
              </button>
              <button className="rounded-[8px] bg-white/10 px-3 py-2" onClick={() => move(1)} type="button">
                Next
              </button>
              <button className="rounded-[8px] bg-[#c7f06b] px-3 py-2 font-bold text-[#142000]" onClick={() => setCurrentReviewed(true)} type="button">
                Mark reviewed
              </button>
            </div>
          </div>
          <div
            className="relative mx-auto max-h-[76vh] max-w-full touch-none select-none overflow-hidden rounded-[8px] bg-black"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={imageFrameRef}
          >
            <img
              alt="Farm review frame"
              className="block max-h-[76vh] w-full object-contain"
              draggable={false}
              referrerPolicy="no-referrer"
              src={activeImage.src}
            />
            {[...activeReview.boxes, ...(draftBox ? [draftBox] : [])].map((box) => (
              <button
                className={`absolute border-2 text-left ${
                  box.id === selectedBoxId ? "border-[#c7f06b]" : "border-[#42c8ff]"
                }`}
                data-box-id={box.id}
                key={box.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedBoxId(box.id);
                  setActiveLabel(box.label);
                }}
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
                type="button"
              >
                <span className="absolute left-0 top-0 bg-[#42c8ff] px-1 py-0.5 text-[10px] font-bold text-black">
                  {LABELS.find((label) => label.value === box.label)?.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-[8px] border border-[rgba(12,17,21,0.12)] bg-white/78 p-4">
          <h2 className="font-serif text-2xl font-semibold">Controls</h2>
          <div className="mt-4 grid gap-2">
            {LABELS.map((label) => (
              <button
                className={`rounded-[8px] border px-3 py-2 text-left text-sm font-bold ${
                  activeLabel === label.value
                    ? "border-[var(--accent-spirit)] bg-[rgba(14,97,93,0.14)]"
                    : "border-[rgba(12,17,21,0.12)] bg-white/70"
                }`}
                key={label.value}
                onClick={() => updateSelectedLabel(label.value)}
                type="button"
              >
                {label.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <button className="btn secondary" onClick={deleteSelectedBox} type="button">
              Delete selected
            </button>
            <button className="btn secondary" onClick={clearBoxes} type="button">
              No fruit visible
            </button>
          </div>
          <div className="mt-5 rounded-[8px] bg-[rgba(12,17,21,0.06)] p-3 text-sm leading-6 text-[var(--ink-soft)]">
            <strong className="text-[var(--ink)]">Progress</strong>
            <br />
            {reviewedCount}/{images.length} images reviewed
            <br />
            {boxCount} passion fruit boxes
            <br />
            {status}
          </div>
        </aside>
      </div>
    </section>
  );
}
