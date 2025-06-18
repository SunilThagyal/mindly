
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Quill, { type QuillOptions } from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { Skeleton } from '@/components/ui/skeleton';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !quillRef.current) {
      return;
    }

    if (!quillInstanceRef.current) {
      const options: QuillOptions = {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'font': [] }, { 'size': [] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
          ],
          clipboard: { matchVisual: false }, // Important for preserving formatting on paste
        },
        placeholder: placeholder || "Start writing...",
      };
      quillInstanceRef.current = new Quill(quillRef.current, options);

      // Set initial content if value is provided
      // Only set if the editor is empty to avoid overriding user input on re-renders
      if (value && quillInstanceRef.current.root.innerHTML === '<p><br></p>') {
         const delta = quillInstanceRef.current.clipboard.convert(value as any);
         quillInstanceRef.current.setContents(delta, 'silent');
      }
    }

    const quill = quillInstanceRef.current;

    const handleChange = () => {
      let html = quill.root.innerHTML;
      // When editor is empty, Quill might return '<p><br></p>'
      // Treat this as an empty string for consistency
      if (html === '<p><br></p>') {
        html = '';
      }
      onChange(html);
    };

    quill.on('text-change', handleChange);

    // Cleanup function
    return () => {
      quill.off('text-change', handleChange);
      // Do not destroy the quill instance here if you want it to persist across re-renders
      // or if the parent component might re-render frequently.
      // If the component is truly unmounting, then:
      // quillInstanceRef.current = null;
    };
  }, [isClient, onChange, placeholder, value]); // Add value to dependencies to handle external updates

  // Update editor content if 'value' prop changes from outside
  useEffect(() => {
    if (quillInstanceRef.current && value !== quillInstanceRef.current.root.innerHTML) {
      // Check if the change is not from the editor itself to avoid infinite loop
      const currentEditorContent = quillInstanceRef.current.root.innerHTML === '<p><br></p>' ? '' : quillInstanceRef.current.root.innerHTML;
      if (value !== currentEditorContent) {
        const delta = quillInstanceRef.current.clipboard.convert(value as any);
        quillInstanceRef.current.setContents(delta, 'silent');
      }
    }
  }, [value]);


  if (!isClient) {
    return (
      <div className="space-y-2 quill-editor-override">
        <Skeleton className="h-10 w-full" /> {/* Mock toolbar */}
        <Skeleton className="h-48 w-full rounded-b-lg border border-input" /> {/* Mock editor area */}
      </div>
    );
  }

  return (
    <div className="quill-editor-override">
      <div ref={quillRef} style={{ minHeight: '200px' }} />
    </div>
  );
};

export default RichTextEditor;
