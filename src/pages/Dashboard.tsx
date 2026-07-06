import { useState } from "react";
import SiteChrome from "../components/SiteChrome";
import PostForm from "../components/PostForm";
import PostFeed from "../components/PostFeed";
import Reveal from "../components/Reveal";
import { useAuth } from "../utils/useAuth";

export default function Dashboard() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <SiteChrome variant="private">
      <main
        className="mx-auto max-w-3xl w-full"
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-0 mb-12">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-3">
              Welcome
            </p>
            <h1 className="font-serif text-4xl md:text-5xl">
              {session?.email ?? "Signed in"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start md:self-auto bg-white text-black px-5 py-3 text-xs uppercase tracking-[0.18em] hover:bg-white/90 transition"
          >
            + New Post
          </button>
        </Reveal>

        <PostFeed />
      </main>

      <PostForm
        open={open}
        onClose={() => setOpen(false)}
        authorEmail={session?.email ?? "unknown"}
      />
    </SiteChrome>
  );
}
