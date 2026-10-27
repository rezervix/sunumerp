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
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm transition-all",
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
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800 mb-1">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${editor.isActive("bold") ? "bg-gray-200 dark:bg-white/10 text-primary" : "text-gray-500"}`}
          title="Kalın"
        >
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${editor.isActive("italic") ? "bg-gray-200 dark:bg-white/10 text-primary" : "text-gray-500"}`}
          title="İtalik"
        >
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run() }}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${editor.isActive("strike") ? "bg-gray-200 dark:bg-white/10 text-primary" : "text-gray-500"}`}
          title="Üstü Çizili"
        >
          <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${editor.isActive("bulletList") ? "bg-gray-200 dark:bg-white/10 text-primary" : "text-gray-500"}`}
          title="Madde İşaretli Liste"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${editor.isActive("orderedList") ? "bg-gray-200 dark:bg-white/10 text-primary" : "text-gray-500"}`}
          title="Numaralı Liste"
        >
          <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
        </button>
      </div>
      <EditorContent editor={editor} />
      {placeholder && !editor.getText() && (
        <div className="absolute top-[88px] left-4 pointer-events-none text-gray-400 text-sm italic">
          {placeholder}
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
