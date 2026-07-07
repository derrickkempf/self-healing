import SiteChrome from "../components/SiteChrome";
import ChatThread from "../components/ChatThread";
import Reveal from "../components/Reveal";
import { useAuth } from "../utils/useAuth";

export default function Chat() {
  const { session } = useAuth();
  return (
    <SiteChrome variant="private">
      <main
        className="mx-auto max-w-3xl w-full flex flex-col pointer-events-auto"
        style={{
          paddingLeft: "var(--cell)",
          paddingRight: "var(--cell)",
          paddingBottom: "calc(var(--cell) * 7)",
        }}
      >
        <Reveal className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
            Collaborators
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Chat</h1>
        </Reveal>
        <Reveal delay={0.18} className="flex-1 flex flex-col">
          <ChatThread currentEmail={session?.email ?? "unknown"} />
        </Reveal>
      </main>
    </SiteChrome>
  );
}
