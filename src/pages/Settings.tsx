import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SiteChrome from "../components/SiteChrome";
import Reveal from "../components/Reveal";
import { logout } from "../utils/auth";
import { useAuth } from "../utils/useAuth";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "../utils/notifications";
import {
  addGalleryImage,
  getNotificationPrefs,
  getProfile,
  listGalleryImages,
  moveGalleryImage,
  removeGalleryImage,
  saveNotificationPrefs,
  saveProfile,
  subscribe,
  updateGalleryCaption,
} from "../utils/supabase";
import type { GalleryImage, NotificationPrefs, Profile } from "../types";

type Section = "profile" | "account" | "notifications" | "gallery";

/**
 * Settings hub.
 *
 *   Sidebar  ─── content panel
 *   Profile        avatar, cover, display name, tagline, links
 *   Account        email (verified), session info
 *   Notifications  toggles + browser permission prompt + email digest cadence
 *   Sign Out       inline at the bottom of the sidebar
 */
export default function Settings() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const email = session?.email ?? "";

  const [params, setParams] = useSearchParams();
  const initial = (params.get("section") as Section) || "profile";
  const [section, setSection] = useState<Section>(initial);

  useEffect(() => {
    setParams((p) => {
      p.set("section", section);
      return p;
    });
  }, [section, setParams]);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <SiteChrome variant="private">
      <main
        className="mx-auto max-w-5xl w-full flex-1 pointer-events-auto"
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <Reveal className="border border-line bg-black">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 md:px-7 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em]">Settings</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Close"
              className="text-muted hover:text-white transition text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-[220px_1fr]">
            {/* Sidebar */}
            <nav className="md:border-r md:border-line p-3 md:p-5 flex md:block overflow-x-auto md:overflow-visible">
              <SidebarItem
                label="Profile"
                active={section === "profile"}
                onClick={() => setSection("profile")}
                icon={<IconUser />}
              />
              <SidebarItem
                label="Account"
                active={section === "account"}
                onClick={() => setSection("account")}
                icon={<IconAt />}
              />
              <SidebarItem
                label="Notifications"
                active={section === "notifications"}
                onClick={() => setSection("notifications")}
                icon={<IconBell />}
              />
              <SidebarItem
                label="Gallery"
                active={section === "gallery"}
                onClick={() => setSection("gallery")}
                icon={<IconGrid />}
              />
              <div className="hidden md:block mt-6 mb-3" />
              <SidebarItem
                label="Sign out"
                onClick={handleLogout}
                icon={<IconLogout />}
              />
            </nav>

            {/* Panel */}
            <section className="p-5 md:p-10 min-h-[520px]">
              {section === "profile" && email && <ProfilePanel email={email} />}
              {section === "account" && <AccountPanel email={email} />}
              {section === "notifications" && email && (
                <NotificationsPanel email={email} />
              )}
              {section === "gallery" && <GalleryPanel />}
            </section>
          </div>
        </Reveal>
      </main>
    </SiteChrome>
  );
}

// ============================================================================
// Sidebar
// ============================================================================

function SidebarItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 md:w-full text-[11px] uppercase tracking-[0.18em] transition whitespace-nowrap ${
        active ? "text-white" : "text-muted hover:text-white"
      }`}
    >
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Profile panel
// ============================================================================

function ProfilePanel({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile(email).then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  function updateLink(idx: number, value: string) {
    setProfile((p) => {
      if (!p) return p;
      const links = [...p.links];
      links[idx] = value;
      return { ...p, links };
    });
    setSaved(false);
  }

  function addLink() {
    if (!profile) return;
    update("links", [...profile.links, ""]);
  }

  function removeLink(idx: number) {
    if (!profile) return;
    update(
      "links",
      profile.links.filter((_, i) => i !== idx),
    );
  }

  async function handleImage(kind: "avatar" | "cover", file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) return;
    const dataUrl = await fileToDataUrl(file);
    if (kind === "avatar") update("avatar_url", dataUrl);
    else update("cover_url", dataUrl);
  }

  async function handleSave() {
    if (!profile) return;
    await saveProfile({
      ...profile,
      email,
      links: profile.links.map((l) => l.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  if (!profile) {
    return <p className="text-muted text-sm">Loading profile…</p>;
  }

  return (
    <div>
      <h2 className="font-serif text-3xl md:text-4xl mb-1">Profile Settings</h2>
      <p className="text-muted text-[12px] mb-8">
        Visible to other collaborators on shared posts and chat.
      </p>

      <div className="mb-10">
        {/* Avatar (Cover image removed per request) */}
        <div>
          <Label>Avatar</Label>
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="block w-[140px] h-[140px] bg-[#222222] border border-line overflow-hidden hover:border-white/60 transition relative group"
            aria-label="Upload avatar"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted text-[10px] uppercase tracking-[0.18em]">
                Upload
              </div>
            )}
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage("avatar", e.target.files?.[0])}
            />
          </button>
          {profile.avatar_url && (
            <button
              type="button"
              onClick={() => update("avatar_url", null)}
              className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted hover:text-white transition"
            >
              Remove
            </button>
          )}
        </div>

      </div>

      <div className="space-y-6 mb-10">
        <div>
          <Label>Display Name</Label>
          <input
            value={profile.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="e.g. Derrick Kempf"
          />
        </div>
        <div>
          <Label>Tagline</Label>
          <input
            value={profile.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            placeholder="e.g. designer / fabricator"
            maxLength={80}
          />
        </div>
        <div>
          <Label>Profile Links</Label>
          <div className="space-y-2">
            {profile.links.length === 0 && (
              <p className="text-[12px] text-muted">
                Personal site, social, portfolio — anything you'd like
                collaborators to see.
              </p>
            )}
            {profile.links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={link}
                  onChange={(e) => updateLink(i, e.target.value)}
                  placeholder="https://"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="px-3 py-3 text-[11px] uppercase tracking-[0.18em] border border-line text-muted hover:text-white hover:border-white/60 transition"
                  aria-label="Remove link"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLink}
              className="text-[11px] uppercase tracking-[0.18em] text-muted hover:text-white transition"
            >
              + Add link
            </button>
          </div>
        </div>
      </div>

      <SaveBar onSave={handleSave} saved={saved} />
    </div>
  );
}

// ============================================================================
// Account panel
// ============================================================================

function AccountPanel({ email }: { email: string }) {
  const issued = useMemo(() => new Date().toLocaleString(), []);
  // Same panel treatment as the Login and OTP screens — bordered
  // #1a1a1a rectangle with a cell of inner padding.
  return (
    <div
      className="border border-white/15"
      style={{
        background: "#1a1a1a",
        borderRadius: "2px",
        padding: "var(--cell)",
      }}
    >
      <h2 className="font-serif text-3xl md:text-4xl mb-1">Account Settings</h2>
      <p className="text-muted text-[12px] mb-8">
        Sign-in identity. Email changes require contact with the project owner.
      </p>

      <div className="space-y-6 max-w-md">
        <div>
          <Label>Email</Label>
          <div className="flex items-center gap-3">
            <input value={email} readOnly className="opacity-90" />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-white/70" /> Verified ·
            Whitelisted
          </p>
        </div>

        <div>
          <Label>Session Issued</Label>
          <p className="text-sub text-[14px]">{issued}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Notifications panel
// ============================================================================

function NotificationsPanel({ email }: { email: string }) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getNotificationPermission(),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNotificationPrefs(email).then((p) => {
      if (!cancelled) setPrefs(p);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  // Persist immediately on every toggle — that's the expected behavior for
  // notification panels and saves the user an explicit Save step.
  async function setAndSave(next: NotificationPrefs) {
    setPrefs(next);
    await saveNotificationPrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleEnableBrowser() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  if (!prefs) {
    return <p className="text-muted text-sm">Loading preferences…</p>;
  }

  return (
    <div>
      <h2 className="font-serif text-3xl md:text-4xl mb-1">
        Notification Settings
      </h2>
      <p className="text-muted text-[12px] mb-8">
        Choose what you want to hear about. Browser alerts appear when this
        site is open in any tab.
      </p>

      {/* Permission banner */}
      <PermissionBanner permission={permission} onEnable={handleEnableBrowser} />

      <div className="space-y-1 mt-8">
        <Toggle
          label="New Posts"
          description="Notify me when a collaborator publishes an update."
          checked={prefs.new_posts}
          onChange={(v) => setAndSave({ ...prefs, new_posts: v })}
        />
        <Toggle
          label="New Chat Messages"
          description="Notify me when someone sends a message in the group chat."
          checked={prefs.new_messages}
          onChange={(v) => setAndSave({ ...prefs, new_messages: v })}
        />
        <Toggle
          label="Ignore My Own Activity"
          description="Don't notify me about posts and messages I created."
          checked={prefs.ignore_own}
          onChange={(v) => setAndSave({ ...prefs, ignore_own: v })}
        />

        {/* Email digest */}
        <div className="py-5 border-t border-line">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em]">
                Email Digest
              </p>
              <p className="text-muted text-[12px] mt-1 max-w-md">
                Recap of activity sent to {email}. (Requires the production
                backend — see README for the SendGrid setup.)
              </p>
            </div>
            <select
              value={prefs.email_digest}
              onChange={(e) =>
                setAndSave({
                  ...prefs,
                  email_digest: e.target
                    .value as NotificationPrefs["email_digest"],
                })
              }
              className="border border-line bg-transparent px-3 py-2 text-[12px] uppercase tracking-[0.18em] cursor-pointer hover:border-white/60 transition"
              style={{ colorScheme: "dark" }}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </div>

      {saved && (
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted">
          Saved
        </p>
      )}
    </div>
  );
}

function PermissionBanner({
  permission,
  onEnable,
}: {
  permission: NotificationPermission;
  onEnable: () => void;
}) {
  if (permission === "granted") {
    return (
      <div className="border border-line px-4 py-3 text-[12px] flex items-center gap-3">
        <span className="inline-block w-1.5 h-1.5 bg-white" />
        Browser notifications are enabled.
      </div>
    );
  }
  if (permission === "denied") {
    return (
      <div className="border border-line px-4 py-3 text-[12px] text-sub">
        Browser notifications are blocked in your settings. Re-enable them
        from your browser's site permissions to receive alerts.
      </div>
    );
  }
  if (permission === "unsupported") {
    return (
      <div className="border border-line px-4 py-3 text-[12px] text-sub">
        This browser doesn't support native notifications. You'll still see
        updates when this tab is open.
      </div>
    );
  }
  return (
    <div className="border border-line px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-[12px] text-sub">
        Enable browser notifications to be alerted about new posts and messages.
      </p>
      <button
        type="button"
        onClick={onEnable}
        className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] border border-white hover:bg-white hover:text-black transition whitespace-nowrap"
      >
        Enable
      </button>
    </div>
  );
}

// ============================================================================
// Gallery panel — admin upload / reorder / caption / remove
// ============================================================================

function GalleryPanel() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const rows = await listGalleryImages();
      if (!cancelled) setImages(rows);
    }
    load();
    const unsub = subscribe("gallery", load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are accepted.");
          continue;
        }
        if (file.size > 4 * 1024 * 1024) {
          setError(`"${file.name}" is over 4 MB and was skipped.`);
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        await addGalleryImage({ url: dataUrl, caption: "" });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <h2 className="font-serif text-3xl md:text-4xl mb-1">Gallery</h2>
      <p className="text-muted text-[12px] mb-8">
        Images shown in the public landing-page gallery. Reorder with the
        arrows; click an image's caption to edit it.
      </p>

      {/* Upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="block w-full border border-dashed border-line hover:border-white/60 transition py-10 mb-8 bg-[#0a0a0a]"
      >
        <p className="text-[12px] uppercase tracking-[0.22em]">
          {uploading ? "Uploading…" : "+ Upload images"}
        </p>
        <p className="text-muted text-[11px] mt-2">
          PNG, JPG, or WebP · up to 4 MB each · multiple selection supported
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </button>

      {error && <p className="text-[12px] text-red-300/90 mb-6">{error}</p>}

      {images.length === 0 ? (
        <p className="text-muted text-[12px]">
          No images yet. Upload one above to start the gallery.
        </p>
      ) : (
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((img, i) => (
            <GalleryRow
              key={img.id}
              image={img}
              isFirst={i === 0}
              isLast={i === images.length - 1}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function GalleryRow({
  image,
  isFirst,
  isLast,
}: {
  image: GalleryImage;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [caption, setCaption] = useState(image.caption);
  const [savedTick, setSavedTick] = useState(false);

  // Keep local state in sync if the image is mutated elsewhere (e.g. reorder
  // doesn't change caption, but a remove + add could).
  useEffect(() => setCaption(image.caption), [image.caption]);

  async function commitCaption() {
    if (caption === image.caption) return;
    await updateGalleryCaption(image.id, caption);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1200);
  }

  return (
    <li className="border border-line bg-[#0a0a0a]">
      <div className="aspect-square w-full overflow-hidden bg-black">
        <img
          src={image.url}
          alt={image.caption}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 space-y-3">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={commitCaption}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Caption (optional)"
          aria-label="Caption"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <IconButton
              label="Move up"
              disabled={isFirst}
              onClick={() => moveGalleryImage(image.id, -1)}
            >
              ↑
            </IconButton>
            <IconButton
              label="Move down"
              disabled={isLast}
              onClick={() => moveGalleryImage(image.id, 1)}
            >
              ↓
            </IconButton>
          </div>
          <div className="flex items-center gap-3">
            {savedTick && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={async () => {
                if (confirm("Remove this image from the gallery?")) {
                  await removeGalleryImage(image.id);
                }
              }}
              className="text-[10px] uppercase tracking-[0.18em] text-muted hover:text-white transition"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 border border-line text-[14px] flex items-center justify-center text-muted enabled:hover:text-white enabled:hover:border-white/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

// ============================================================================
// Shared primitives
// ============================================================================

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
      {children}
    </p>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="py-5 border-t border-line flex items-start justify-between gap-6">
      <div>
        <p className="text-[12px] uppercase tracking-[0.18em]">{label}</p>
        <p className="text-muted text-[12px] mt-1 max-w-md">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-6 border transition ${
          checked
            ? "bg-white border-white"
            : "bg-transparent border-line hover:border-white/50"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-[2px] w-[18px] h-[18px] transition ${
            checked ? "left-[26px] bg-black" : "left-[2px] bg-white/70"
          }`}
        />
      </button>
    </div>
  );
}

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="border-t border-line pt-6 flex items-center justify-end gap-4">
      {saved && (
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Saved
        </span>
      )}
      <button
        type="button"
        onClick={onSave}
        className="px-6 py-3 text-[11px] uppercase tracking-[0.18em] bg-white text-black hover:bg-white/90 transition"
      >
        Save
      </button>
    </div>
  );
}

// ============================================================================
// Icons (inline SVG to avoid an extra dependency)
// ============================================================================

function IconUser() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function IconAt() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}
