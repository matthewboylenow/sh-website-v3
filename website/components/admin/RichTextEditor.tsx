"use client";

import { upload } from "@vercel/blob/client";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { MediaPickerModal } from "./MediaPickerModal";

/**
 * Rich-text editor used across content editors (events.body,
 * ministries.description, staff.bio). Outputs sanitized HTML — output
 * goes into a hidden form field so it round-trips through standard
 * FormData submission. Server sanitizes again on read in
 * RichTextRenderer.
 *
 * Image insert reuses the same upload flow as PhotoUploader so embedded
 * images become real blob_assets rows. The image's `data-blob-key`
 * attribute records the asset key — handy for orphan cleanup later.
 */
export function RichTextEditor({
  name,
  initialHtml,
  pathPrefix,
  placeholder,
  onChange,
}: {
  /** Form field name. When provided, a hidden input carries the resulting HTML. */
  name?: string;
  /** Initial HTML when editing an existing row. */
  initialHtml?: string | null;
  /**
   * Where in Blob storage to put inline images, e.g. "events/<id>".
   * Same shape as PhotoUploader's pathPrefix.
   */
  pathPrefix: string;
  placeholder?: string;
  /** Optional controlled-state callback. Use *or* `name`, not both. */
  onChange?: (html: string) => void;
}) {
  const [html, setHtml] = useState<string>(initialHtml ?? "");

  const editor = useEditor({
    immediatelyRender: false, // SSR: prevent hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "rounded-md" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write…",
      }),
    ],
    content: initialHtml ?? "",
    editorProps: {
      attributes: {
        class:
          "sh-prose min-h-[200px] max-w-none px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
    },
  });

  // Keep the hidden input synced when the editor is first ready.
  useEffect(() => {
    if (!editor) return;
    setHtml(editor.getHTML());
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-md border border-rule bg-white px-4 py-6 text-sm text-ink-3">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="rounded-md border border-rule bg-white">
      <Toolbar editor={editor} pathPrefix={pathPrefix} />
      <EditorContent editor={editor} />
      {name && <input type="hidden" name={name} value={html} />}
    </div>
  );
}

/* ---------------- toolbar ---------------- */

function Toolbar({
  editor,
  pathPrefix,
}: {
  editor: Editor;
  pathPrefix: string;
}) {
  const [imgPending, setImgPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const onLibraryPick = (item: { key: string; url: string; alt: string | null }) => {
    editor
      .chain()
      .focus()
      .setImage({ src: item.url, alt: item.alt ?? "" })
      .run();
    editor.chain().focus().updateAttributes("image", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ["data-blob-key" as any]: item.key,
    }).run();
    setPickerOpen(false);
  };

  const insertLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const insertImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImgPending(true);
      try {
        const dims = await readImageDimensions(file).catch(() => ({
          width: null as number | null,
          height: null as number | null,
        }));
        const safeName = file.name
          .normalize("NFKD")
          .replace(/[^\w.-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase();
        const pathname = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/inline/${safeName}`;

        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        });

        const completeRes = await fetch("/api/admin/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            pathname: blob.pathname,
            contentType: file.type,
            byteSize: file.size,
            width: dims.width,
            height: dims.height,
          }),
        });
        if (!completeRes.ok) {
          alert("Image upload failed at the confirm step.");
          return;
        }
        const { key, blobUrl } = (await completeRes.json()) as {
          key: string;
          blobUrl: string;
        };
        editor
          .chain()
          .focus()
          .setImage({ src: blobUrl, alt: file.name })
          .run();
        // Stamp the blob key on the resulting <img> via setAttributes —
        // makes orphan cleanup possible later.
        editor.chain().focus().updateAttributes("image", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ["data-blob-key" as any]: key,
        }).run();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Image upload failed.");
      } finally {
        setImgPending(false);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-rule bg-cream/60 px-2 py-1">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        label="Inline code"
      >
        <code className="text-[11px]">{`</>`}</code>
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Heading 3"
      >
        H3
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Blockquote"
      >
        ❝
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Horizontal rule"
      >
        ―
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        active={editor.isActive("link")}
        onClick={insertLink}
        label="Insert link"
      >
        🔗
      </ToolbarButton>
      <ToolbarButton
        onClick={insertImage}
        disabled={imgPending}
        label="Upload image"
      >
        {imgPending ? "…" : "🖼"}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setPickerOpen(true)}
        label="Pick from library"
      >
        📚
      </ToolbarButton>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onLibraryPick}
      />
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded px-2 py-1 text-sm transition-colors ${
        active
          ? "bg-navy text-white"
          : "text-ink-2 hover:bg-white"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-rule" />;
}

async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const out = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return out;
  }
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}
