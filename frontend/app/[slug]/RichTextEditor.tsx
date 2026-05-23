"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

interface Props {
  body: string;
  onChange: (value: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? "bg-black dark:bg-white text-white dark:text-black"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function Divider(): React.ReactElement {
  return <span className="w-px h-4 bg-black/15 dark:bg-white/15 mx-0.5" />;
}

function Toolbar({ editor }: { editor: Editor }): React.ReactElement {
  const state = useEditorState({
    editor,
    selector: (snap) => ({
      bold: snap.editor.isActive("bold"),
      italic: snap.editor.isActive("italic"),
      underline: snap.editor.isActive("underline"),
      strike: snap.editor.isActive("strike"),
      code: snap.editor.isActive("code"),
      h1: snap.editor.isActive("heading", { level: 1 }),
      h2: snap.editor.isActive("heading", { level: 2 }),
      h3: snap.editor.isActive("heading", { level: 3 }),
      bullet: snap.editor.isActive("bulletList"),
      ordered: snap.editor.isActive("orderedList"),
      blockquote: snap.editor.isActive("blockquote"),
      codeBlock: snap.editor.isActive("codeBlock"),
      link: snap.editor.isActive("link"),
    }),
  });

  function handleLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleImage() {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-black/10 dark:border-white/10">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={state.bold} title="Bold (⌘B)">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={state.italic} title="Italic (⌘I)">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={state.underline} title="Underline (⌘U)">
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={state.strike} title="Strikethrough">
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={state.code} title="Inline code">
        {"</>"}
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={state.h1} title="Heading 1">
        H1
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={state.h2} title="Heading 2">
        H2
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={state.h3} title="Heading 3">
        H3
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={state.bullet} title="Bullet list">
        •—
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={state.ordered} title="Ordered list">
        1.
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={state.blockquote} title="Blockquote">
        "
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={state.codeBlock} title="Code block">
        {"{}"}
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={handleLink} active={state.link} title="Insert / edit link">
        Link
      </ToolbarButton>
      <ToolbarButton onClick={handleImage} title="Insert image">
        Image
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        —
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ body, onChange }: Props): React.ReactElement {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
    ],
    content: body,
    immediatelyRender: false,
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== body) {
      editor.commands.setContent(body);
    }
  }, [body, editor]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {editor && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-full"
      />
    </div>
  );
}
