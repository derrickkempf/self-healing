import { useEffect, useRef, useState } from "react";
import { createPost } from "../utils/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  authorEmail: string;
  onCreated?: () => void;
}

/**
 * Modal for creating a new post. Reads the image as a base64 data URL so it
 * persists in localStorage alongside the post. When you swap in real
 * Supabase, replace `fileToDataUrl` with a Supabase Storage upload that
 * returns a public URL.
 */
export default function PostForm({ open, onClose, authorEmail, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Reset state whenever the modal is reopened.
  useEffect(() => {
    if (open) {
      setTitle("");
      setContent("");
      setImageUrl(null);
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Image must be under 4 MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setImageUrl(dataUrl);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    createPost({
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl,
      author_email: authorEmail,
    });
    setSubmitting(false);
    onCreated?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl mx-4 my-8 md:my-0 bg-ink border border-line">
        <div className="flex items-center justify-between px-6 py-4 hairline">
          <h2 className="font-serif text-2xl">New Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.18em] text-muted hover:text-white transition"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What happened today?"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Details, observations, links…"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
              Image (optional)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="!p-2 text-sm"
            />
            {imageUrl && (
              <div className="mt-3 border border-line p-2">
                <img src={imageUrl} alt="" className="max-h-48 w-auto" />
              </div>
            )}
          </div>

          {error && <p className="text-[12px] text-red-300/90">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-xs uppercase tracking-[0.18em] border border-line text-muted hover:text-white hover:border-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-xs uppercase tracking-[0.18em] bg-white text-black disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
