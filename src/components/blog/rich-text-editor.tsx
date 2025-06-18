
"use client";

import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { Skeleton } from '@/components/ui/skeleton'; // Keep skeleton for initial load if needed by Next.js dynamic

// Dynamically import ReactQuill if direct import still causes issues with non-beta features,
// but for beta, direct import is usually intended for client components.
// For this solution, we are trying direct import as per prompt's Option 1.

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  // The toolbar configuration includes font, size, and align, which are standard Quill modules.
  // react-quill@2.0.0-beta.4 should handle these without manual registration of formats.
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'font': [] }, { 'size': [] }], // Font and size dropdowns
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }], // Alignment dropdown
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false, // This is crucial for preserving formatting on paste
    },
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'script', 'indent', 'align',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  // Check if ReactQuill is available (it should be, as it's imported directly)
  // Fallback to skeleton if component is not ready (though direct import should make it ready)
  if (typeof ReactQuill !== 'function' && typeof ReactQuill !== 'object') {
     return (
        <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
  }
  
  const handleChange = (html: string) => {
    // Prevent onChange from being called with an empty paragraph if editor is truly empty
    const textContent = new DOMParser().parseFromString(html, "text/html").documentElement.textContent || "";
    if ((html === '<p><br></p>' || html === '') && textContent.trim() === '') {
      onChange(''); 
    } else {
      onChange(html);
    }
  };


  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={handleChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder || "Start writing..."}
      className="bg-card quill-editor-override" // Apply custom styling class
    />
  );
};

export default RichTextEditor;
