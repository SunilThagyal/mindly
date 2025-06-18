
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
            ['link', 'image'],
            ['clean']
          ],
          clipboard: { matchVisual: false },
        },
        placeholder: placeholder || "Start writing...",
      };
      quillInstanceRef.current = new Quill(quillRef.current, options);

      // Set initial content if value is provided and editor is empty
      // Ensure value is treated as HTML, convert to Delta
      if (value && quillInstanceRef.current.getLength() <= 1) { // getLength() <= 1 means editor is empty (just a newline)
         try {
           const delta = quillInstanceRef.current.clipboard.convert(value as any);
           quillInstanceRef.current.setContents(delta, 'silent');
         } catch (e) {
            console.error("Error setting initial Quill content:", e, "HTML:", value);
         }
      }
    }

    const quill = quillInstanceRef.current;

    const handleChange = (delta: any, oldDelta: any, source: string) => {
      if (source === 'user') {
        selfEditRef.current = true;
        let html = quill.root.innerHTML;
        // Check if the editor content is just the placeholder paragraph with a line break
        if (html === '<p><br></p>') {
          html = ''; // Treat it as an empty string
        }
        onChange(html);
      }
    };

    quill.on('text-change', handleChange);

    return () => {
      quill.off('text-change', handleChange);
    };
  }, [isClient, onChange, placeholder]); // Removed 'value' from this main setup useEffect


  useEffect(() => {
    if (!isClient || !quillInstanceRef.current || selfEditRef.current) {
      if (selfEditRef.current) {
        // Reset the flag if this effect was skipped due to self-editing
        selfEditRef.current = false;
      }
      return;
    }

    const quill = quillInstanceRef.current;

    try {
      // Convert the incoming HTML prop 'value' to a Delta.
      // Ensure 'value' is a string; if it's null/undefined (though schema should prevent this), treat as empty.
      const incomingHtml = typeof value === 'string' ? value : '';
      const incomingDelta = quill.clipboard.convert(incomingHtml as any);

      // Get the current content of the editor as a Delta
      const currentEditorDelta = quill.getContents();

      // Compare the Deltas. Quill's Delta has a diff() method.
      // If there's a difference (diff ops array is not empty), update the editor.
      if (currentEditorDelta.diff(incomingDelta).ops.length > 0) {
        quill.setContents(incomingDelta, 'silent');
      }
    } catch (e) {
      console.error("Error processing or setting Quill content from prop:", e, "Incoming HTML value:", value);
      // Fallback: if conversion or comparison fails, it might be due to malformed HTML.
      // You might want to clear the editor or show an error.
      // For now, logging error. Quill might remain unchanged.
    }
  }, [value, isClient]); // Only trigger this effect if 'value' or 'isClient' changes.


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
