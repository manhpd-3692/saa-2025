"use client";

import { useRef, useState } from "react";
import { isApiError } from "@/lib/api/api-error";
import {
  createKudo,
  discardKudoUpload,
  ImageUploadError,
  serverFieldErrors,
  updateKudo,
  uploadKudoImage,
  type KudoEditForm,
  type SunnerOption,
} from "./kudo-compose-api";
import { IMAGES_MAX, imageFileProblem, normalizeHashtags, validateKudoInput, type FieldError, type KudoField } from "./kudo-input-schema";

/** `create` may preselect a recipient (hover card "Gửi KUDO"); it stays changeable. */
export type ComposeMode = { kind: "create"; recipient?: SunnerOption } | { kind: "edit"; kudoId: string };

/** One thumbnail. `committed` = part of the saved kudo (edit prefill): removing it only drops it from the save (R04). */
export interface ComposeImage {
  key: string;
  uploadId: string | null;
  previewUrl: string | null;
  status: "uploading" | "ready" | "failed";
  committed: boolean;
  file: File | null;
}

export interface ComposeValues {
  recipient: SunnerOption | null;
  title: string;
  contentHtml: string;
  hashtags: string[];
  images: ComposeImage[];
  isAnonymous: boolean;
}

export function initialComposeValues(form?: KudoEditForm, recipient?: SunnerOption): ComposeValues {
  if (!form) return { recipient: recipient ?? null, title: "", contentHtml: "", hashtags: [], images: [], isAnonymous: false };
  return {
    recipient: form.receiver,
    title: form.title,
    contentHtml: form.contentHtml,
    hashtags: form.hashtags,
    images: form.images.map((img) => ({ key: img.uploadId, uploadId: img.uploadId, previewUrl: img.url, status: "ready", committed: true, file: null })),
    isAnonymous: form.isAnonymous,
  };
}

/** Dictionary key of a send/save failure that is not a field error (FR-402). */
function problemKey(error: unknown): string {
  if (!isApiError(error)) return "kudo-compose.error.generic";
  if (error.status === 401) return "kudo-compose.error.session";
  const byCode: Record<string, string> = {
    invalid_attachment: "kudo-compose.error.invalidAttachment",
    not_kudo_author: "kudo-compose.error.notAuthor",
    kudo_spam_locked: "kudo-compose.error.spamLocked",
    kudo_not_found: "kudo-compose.error.notFound",
  };
  return byCode[error.code] ?? "kudo-compose.error.generic";
}

/**
 * State of the write-kudo form (SM-001: editing ⇄ showing errors → submitting
 * → closed). New images upload as soon as they are picked; removing one, or
 * cancelling, deletes its unsaved upload best-effort (A8, AD05). A failed send
 * keeps every value (FR-402); Go's 422 field errors land on the same fields.
 */
export function useKudoComposeForm(mode: ComposeMode, initial: ComposeValues, onSaved: () => void) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false); // synchronous: two clicks in one instant both see the old state
  const imagesRef = useRef(initial.images);
  const liveKeys = useRef(new Set(initial.images.map((img) => img.key)));

  function change<K extends keyof ComposeValues>(key: K, value: ComposeValues[K], field?: KudoField) {
    setValues((v) => ({ ...v, [key]: value }));
    if (field) setErrors((list) => list.filter((e) => e.field !== field));
    setProblem(null);
  }

  /** The ref is the source of truth for images, so async upload callbacks never read a stale list. */
  function setImages(update: (images: ComposeImage[]) => ComposeImage[]) {
    const next = update(imagesRef.current);
    imagesRef.current = next;
    setValues((v) => ({ ...v, images: next }));
  }

  function patchImage(key: string, patch: Partial<ComposeImage>) {
    setImages((list) => list.map((img) => (img.key === key ? { ...img, ...patch } : img)));
  }

  function upload(key: string, file: File) {
    uploadKudoImage(file).then(
      (uploadId) => {
        if (liveKeys.current.has(key)) patchImage(key, { uploadId, status: "ready" });
        else void discardKudoUpload(uploadId); // removed or cancelled while uploading
      },
      (error: unknown) => {
        const uploadId = error instanceof ImageUploadError ? error.uploadId : null;
        if (liveKeys.current.has(key)) patchImage(key, { uploadId, status: "failed" });
        else if (uploadId) void discardKudoUpload(uploadId);
      },
    );
  }

  function addFiles(files: File[]) {
    const room = IMAGES_MAX - imagesRef.current.length;
    const accepted = files.filter((f) => imageFileProblem(f) === null).slice(0, Math.max(room, 0));
    setImageNotice(accepted.length < files.length ? "kudo-compose.image.refused" : null);
    const added = accepted.map<ComposeImage>((file) => ({
      key: crypto.randomUUID(), uploadId: null, previewUrl: URL.createObjectURL(file), status: "uploading", committed: false, file,
    }));
    if (added.length === 0) return;
    for (const img of added) liveKeys.current.add(img.key);
    setImages((list) => [...list, ...added]);
    setErrors((list) => list.filter((e) => e.field !== "images"));
    for (const img of added) upload(img.key, img.file as File);
  }

  function forget(img: ComposeImage) {
    liveKeys.current.delete(img.key);
    if (!img.committed && img.uploadId) void discardKudoUpload(img.uploadId);
    if (img.file && img.previewUrl) URL.revokeObjectURL(img.previewUrl);
  }

  function removeImage(key: string) {
    const img = imagesRef.current.find((i) => i.key === key);
    if (!img) return;
    forget(img);
    setImages((list) => list.filter((i) => i.key !== key));
    setImageNotice(null);
  }

  function retryImage(key: string) {
    const img = imagesRef.current.find((i) => i.key === key);
    if (!img?.file) return;
    if (img.uploadId) void discardKudoUpload(img.uploadId); // its signed URL was issued, the bytes never landed
    patchImage(key, { uploadId: null, status: "uploading" });
    upload(key, img.file);
  }

  /** Hủy (FR-405): unsaved uploads are deleted best-effort; committed images stay untouched. */
  function discardUnsaved() {
    for (const img of imagesRef.current) forget(img);
  }

  async function submit() {
    if (sending.current) return;
    const images = imagesRef.current;
    if (images.some((img) => img.status !== "ready")) {
      setProblem("kudo-compose.image.pending");
      return;
    }
    const found = validateKudoInput(
      { receiverId: values.recipient?.id ?? null, title: values.title, contentHtml: values.contentHtml, hashtags: values.hashtags, imageCount: images.length },
      mode.kind,
    );
    setErrors(found);
    setProblem(null);
    if (found.length > 0) return;

    const body = {
      title: values.title,
      contentHtml: values.contentHtml,
      hashtags: normalizeHashtags(values.hashtags).names,
      imageUploadIds: images.map((img) => img.uploadId as string),
      isAnonymous: values.isAnonymous,
    };
    sending.current = true;
    setSubmitting(true);
    try {
      if (mode.kind === "create") await createKudo({ ...body, receiverId: values.recipient?.id });
      else await updateKudo(mode.kudoId, body);
      liveKeys.current.clear(); // every new upload is attached now
      for (const img of images) if (img.file && img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      onSaved();
    } catch (error) {
      const fields = serverFieldErrors(error);
      if (fields.length > 0) setErrors(fields);
      else setProblem(problemKey(error));
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  return { values, change, errors, problem, imageNotice, submitting, addFiles, removeImage, retryImage, discardUnsaved, submit };
}

export type KudoComposeForm = ReturnType<typeof useKudoComposeForm>;
