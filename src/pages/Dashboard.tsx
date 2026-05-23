import { useState } from "react";
import Header from "../components/Header";
import PostForm from "../components/PostForm";
import PostFeed from "../components/PostFeed";
import Reveal from "../components/Reveal";
import { useAuth } from "../utils/useAuth";

export default function Dashboard() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="private" />

      <main className="mx-auto max-w-3xl w-full px-6 md:px-10 py-12 md:py-16">
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-0 mb-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
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

        <Reveal delay={0.15}>
          <div className="hairline mb-12" />
        </Reveal>

        <PostFeed />
      </main>

      <PostForm
        open={open}
        onClose={() => setOpen(false)}
        authorEmail={session?.email ?? "unknown"}
      />
    </div>
  );
}
