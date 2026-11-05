"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NewsArticleEditorProps {
  value: string;
  onChange: (html: string) => void;
}

function ToolButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-[var(--y-text-dim)] transition-colors hover:bg-[var(--y-bg-hover)] hover:text-[var(--y-text)] disabled:pointer-events-none disabled:opacity-40",
        active && "bg-[var(--y-bg-hover)] text-[var(--y-primary)]",
      )}
    >
      {children}
    </button>
  );
}

export function NewsArticleEditor({ value, onChange }: NewsArticleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image,
      Underline,
      Placeholder.configure({
        placeholder: "Tulis isi berita di sini…",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      heading2: current?.isActive("heading", { level: 2 }) ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      link: current?.isActive("link") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL tautan", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--y-border)] bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#e5e7eb] bg-[#f9fafb] p-1.5">
        <ToolButton
          title="Tebal"
          active={state?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolButton>
        <ToolButton
          title="Miring"
          active={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolButton>
        <ToolButton
          title="Garis bawah"
          active={state?.underline}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-[#e5e7eb]" />
        <ToolButton
          title="Heading 2"
          active={state?.heading2}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={15} />
        </ToolButton>
        <ToolButton
          title="Daftar butir"
          active={state?.bulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolButton>
        <ToolButton
          title="Daftar bernomor"
          active={state?.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-[#e5e7eb]" />
        <ToolButton title="Tautan" active={state?.link} onClick={setLink}>
          <Link2 size={15} />
        </ToolButton>
        <ToolButton
          title="Undo"
          disabled={!state?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton
          title="Redo"
          disabled={!state?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolButton>
      </div>

      <div className="max-h-[340px] overflow-y-auto">
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:text-[13px]"
        />
      </div>
    </div>
  );
}
