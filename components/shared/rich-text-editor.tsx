"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

const RichTextEditor = ({ value, onChange, placeholder, maxLength }: RichTextEditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm  max-w-none focus:outline-none min-h-[150px] px-4 py-3 bg-[var(--muted-bg)] border border-[var(--line)] rounded-xl text-sm transition-all",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (maxLength && editor.getText().length > maxLength) {
        // Simple truncation if needed (better to handle in UI)
        onChange(html)
      } else {
        onChange(html)
      }
    },
  })

  // Sync value from props if changed externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 bg-gray-100 (--muted-bg)] rounded-lg border border-[var(--line)] mb-1">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 :bg-[var(--muted-bg)] transition-colors ${editor.isActive("bold") ? "bg-gray-200 (--muted-bg)] text-primary" : "text-[var(--text-muted)]"}`}
          title="Kalın"
        >
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 :bg-[var(--muted-bg)] transition-colors ${editor.isActive("italic") ? "bg-gray-200 (--muted-bg)] text-primary" : "text-[var(--text-muted)]"}`}
          title="İtalik"
        >
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-gray-200 :bg-[var(--muted-bg)] transition-colors ${editor.isActive("strike") ? "bg-gray-200 (--muted-bg)] text-primary" : "text-[var(--text-muted)]"}`}
          title="Üstü Çizili"
        >
          <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
          className={`p-1.5 rounded hover:bg-gray-200 :bg-[var(--muted-bg)] transition-colors ${editor.isActive("bulletList") ? "bg-gray-200 (--muted-bg)] text-primary" : "text-[var(--text-muted)]"}`}
          title="Madde İşaretli Liste"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
          className={`p-1.5 rounded hover:bg-gray-200 :bg-[var(--muted-bg)] transition-colors ${editor.isActive("orderedList") ? "bg-gray-200 (--muted-bg)] text-primary" : "text-[var(--text-muted)]"}`}
          title="Numaralı Liste"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
        </button>
      </div>
      <EditorContent editor={editor} />
      {placeholder && !editor.getText() && (
        <div className="absolute top-[88px] left-4 pointer-events-none text-[var(--text-muted)] text-sm italic">
          {placeholder}
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
