
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
  // Ref to track if the current change originated from the editor itself
  const selfEditRef = useRef(false);

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
            ['link', 'image'], // 'video' removed based on previous context
            ['clean']
          ],
          clipboard: { matchVisual: false },
        },
        placeholder: placeholder || "Start writing...",
      };
      quillInstanceRef.current = new Quill(quillRef.current, options);

      // Set initial content if value is provided and editor is empty
      if (value && quillInstanceRef.current.root.innerHTML === '<p><br></p>') {
         const delta = quillInstanceRef.current.clipboard.convert(value as any);
         quillInstanceRef.current.setContents(delta, 'silent');
      }
    }

    const quill = quillInstanceRef.current;

    const handleChange = (delta: any, oldDelta: any, source: string) => {
      if (source === 'user') {
        selfEditRef.current = true; // Mark that this change is from user input
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') {
          html = '';
        }
        onChange(html);
      }
    };

    quill.on('text-change', handleChange);

    return () => {
      quill.off('text-change', handleChange);
    };
  }, [isClient, onChange, placeholder]); // Removed 'value' from this useEffect's dependencies

  // Separate useEffect for handling external 'value' prop changes
  useEffect(() => {
    if (quillInstanceRef.current && isClient) {
      // If the change was initiated by the editor itself, don't re-apply it
      if (selfEditRef.current) {
        selfEditRef.current = false; // Reset the flag
        return;
      }

      const currentEditorHTML = quillInstanceRef.current.root.innerHTML;
      // Normalize Quill's empty state to an empty string for comparison
      const normalizedEditorContent = (currentEditorHTML === '<p><br></p>') ? '' : currentEditorHTML;
      
      // Only update if the new value prop is different from the current editor content
      if (value !== normalizedEditorContent) {
        try {
            const delta = quillInstanceRef.current.clipboard.convert(value as any);
            quillInstanceRef.current.setContents(delta, 'silent');
        } catch (error) {
            console.error("Error converting or setting Quill content:", error, "HTML value:", value);
            // As a fallback, if conversion fails, try to set HTML directly (less safe but might work for simple HTML)
            // Or, consider clearing the editor if the HTML is truly invalid.
            // For now, logging error. A more robust solution might involve sanitizing 'value' or
            // providing a specific error message to the user if AI generates malformed HTML.
        }
      }
    }
  }, [value, isClient]); // This effect now solely focuses on external 'value' changes


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
