import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

/**
 * RichTextEditor — TipTap-based WYSIWYG editor styled to match the site.
 *
 * Feature set (StarterKit + Link extension):
 *   • Paragraph
 *   • Headings H2 / H3
 *   • Bold / Italic
 *   • Bullet list / Ordered list
 *   • Blockquote
 *   • Inline code
 *   • Horizontal rule
 *   • Link (add / remove)
 *   • Undo / Redo
 *
 * Output is HTML — stored as `body_html` in the site_content table.
 */

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "calc(var(--cell) * 8)",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "underline underline-offset-2 text-white hover:opacity-80",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose-rte outline-none",
      },
    },
  });

  // Keep the editor's internal state in sync when `value` changes from
  // outside (e.g., the parent switches to a different content key).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="border border-white/15 flex items-center justify-center text-white/40 text-sm"
        style={{ minHeight, borderRadius: "2px" }}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className="border border-white/15"
      style={{ borderRadius: "2px", background: "#111" }}
    >
      <Toolbar editor={editor} />
      <div
        className="p-4 rte-body"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      {/*
        Inline styles so the editor content renders like the rest of the
        site — DD Scottish Dewd Condensed for headings, CMU Typewriter for body,
        proper spacing on lists / blockquotes. Kept scoped via .rte-body
        so it doesn't leak into other prose on the page.
      */}
      <style>{`
        .rte-body .prose-rte { min-height: 100%; font-family: "CMU Typewriter Text", monospace; font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.85); }
        .rte-body h2 { font-family: "DD Scottish Dewd Condensed", serif; font-size: 24px; line-height: 1.1; margin: 0.8em 0 0.4em; text-transform: uppercase; letter-spacing: 0.03em; color: #fff; }
        .rte-body h3 { font-family: "DD Scottish Dewd Condensed", serif; font-size: 18px; line-height: 1.2; margin: 0.8em 0 0.4em; color: #fff; }
        .rte-body p { margin: 0 0 0.8em; }
        .rte-body ul, .rte-body ol { padding-left: 1.4em; margin: 0 0 0.8em; }
        .rte-body ul { list-style: disc; }
        .rte-body ol { list-style: decimal; }
        .rte-body blockquote { border-left: 2px solid rgba(255,255,255,0.25); padding-left: 1em; margin: 0.4em 0 0.8em; color: rgba(255,255,255,0.7); font-style: italic; }
        .rte-body code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 2px; }
        .rte-body hr { border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 1em 0; }
        .rte-body a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
        .rte-body p.is-editor-empty:first-child::before {
          content: "${placeholder?.replace(/"/g, '\\"') ?? ""}";
          color: rgba(255,255,255,0.35);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .rte-body .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  );
}

/**
 * Toolbar — compact set of buttons that map to the extension features
 * enabled above. Each button reflects the editor's current state via
 * `isActive` so users can see what formatting is applied.
 */
function Toolbar({ editor }: { editor: Editor }) {
  const btnBase =
    "px-2 py-1 text-[10px] uppercase tracking-[0.18em] border transition";
  const active = "border-white/70 bg-white/10 text-white";
  const idle =
    "border-white/15 text-white/60 hover:text-white hover:border-white/40";

  function applyLink() {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL (leave blank to remove)", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1 p-2 border-b border-white/15"
      style={{ background: "#141414" }}
    >
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={`${btnBase} ${
          editor.isActive("heading", { level: 2 }) ? active : idle
        }`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        className={`${btnBase} ${
          editor.isActive("heading", { level: 3 }) ? active : idle
        }`}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`${btnBase} ${
          editor.isActive("paragraph") ? active : idle
        }`}
      >
        ¶
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btnBase} ${editor.isActive("bold") ? active : idle}`}
        style={{ fontWeight: 700 }}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btnBase} ${editor.isActive("italic") ? active : idle}`}
        style={{ fontStyle: "italic" }}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btnBase} ${
          editor.isActive("bulletList") ? active : idle
        }`}
      >
        UL
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btnBase} ${
          editor.isActive("orderedList") ? active : idle
        }`}
      >
        OL
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${btnBase} ${
          editor.isActive("blockquote") ? active : idle
        }`}
      >
        &ldquo; &rdquo;
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={`${btnBase} ${idle}`}
      >
        HR
      </button>
      <button
        type="button"
        onClick={applyLink}
        className={`${btnBase} ${editor.isActive("link") ? active : idle}`}
      >
        Link
      </button>

      <span className="flex-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={`${btnBase} ${idle} disabled:opacity-30`}
      >
        Undo
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={`${btnBase} ${idle} disabled:opacity-30`}
      >
        Redo
      </button>
    </div>
  );
}
