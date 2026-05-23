import Header from "../components/Header";
import ChatThread from "../components/ChatThread";
import Reveal from "../components/Reveal";
import { useAuth } from "../utils/useAuth";

export default function Chat() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="private" />
      <main className="mx-auto max-w-3xl w-full px-6 md:px-10 py-8 md:py-10 flex-1 flex flex-col">
        <Reveal className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
            Collaborators
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Chat</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="hairline mb-4" />
        </Reveal>
        <Reveal delay={0.18} className="flex-1 flex flex-col">
          <ChatThread currentEmail={session?.email ?? "unknown"} />
        </Reveal>
      </main>
    </div>
  );
}
