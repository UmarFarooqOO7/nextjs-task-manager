"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, List, ListOrdered, Code, Link as LinkIcon, Undo, Redo } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useRef } from "react"

type Props = {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ content = "", onChange, placeholder = "Write something...", className }: Props) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML())
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes("link").href
    const url = window.prompt("URL", prev)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex items-center gap-0.5 border-b px-1 py-1">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          label="Code"
        >
          <Code className="size-3.5" />
        </ToolbarButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={setLink}
          label="Link"
        >
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          label="Undo"
          disabled={!editor.can().undo()}
        >
          <Undo className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          label="Redo"
          disabled={!editor.can().redo()}
        >
          <Redo className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({ children, active, onClick, label, disabled }: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
