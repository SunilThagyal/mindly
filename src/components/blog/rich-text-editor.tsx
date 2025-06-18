
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
  // This ref helps distinguish between user edits and programmatic updates
  const selfEditRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect for Quill initialization and attaching event listeners
  useEffect(() => {
    if (!isClient || !quillRef.current) {
      return;
    }

    let quill: Quill;

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
      quill = new Quill(quillRef.current, options);
      quillInstanceRef.current = quill;

      // Set initial content if value is provided and editor is empty
      if (value && typeof value === 'string' && quill.getLength() <= 1) {
         try {
           const delta = quill.clipboard.convert(value as any); // 'as any' for broader HTML compatibility
           quill.setContents(delta, 'silent'); // Use 'silent' for initial content
         } catch (e) {
            console.error("Error setting initial Quill content:", e, "HTML:", value);
         }
      }
    } else {
      quill = quillInstanceRef.current;
    }

    const handleChange = (delta: any, oldDelta: any, source: string) => {
      if (source === 'user') { // Only react to changes made by the user directly in the editor
        selfEditRef.current = true; // Set the flag to true *before* calling onChange
        let html = quill.root.innerHTML;
        // If editor is empty, Quill often represents it as <p><br></p>. Normalize to empty string.
        if (html === '<p><br></p>') {
          html = '';
        }
        onChange(html); // Propagate the change to the parent component
      }
    };

    quill.on('text-change', handleChange);

    return () => {
      quill.off('text-change', handleChange);
      // Consider destroying Quill instance if component unmounts, though often not necessary for single instance
      // if (quillInstanceRef.current && quillRef.current?.innerHTML) {
      //   quillRef.current.innerHTML = ''; // Clear the div
      // }
    };
  // `value` is intentionally omitted from this effect's dependencies after initial setup.
  // Prop-based updates are handled by the next useEffect.
  }, [isClient, onChange, placeholder]);


  // Effect for synchronizing editor content when 'value' prop changes externally
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!isClient || !quill) {
      return;
    }

    // If selfEditRef is true, it means the change originated from this editor's 'text-change' event,
    // was propagated to the parent, and then came back as a 'value' prop. We should ignore it to prevent loops.
    if (selfEditRef.current) {
      selfEditRef.current = false; // Reset the flag and do nothing more for this render cycle
      return;
    }

    // If selfEditRef is false, the change to 'value' came from an external source (e.g., AI generation)
    // or it's an update that needs to be reflected.
    try {
      const incomingHtml = typeof value === 'string' ? value : '';
      const currentEditorHtml = quill.root.innerHTML;

      // Normalize empty HTML representations for a more reliable comparison
      const normalizedIncomingHtml = (incomingHtml === '<p><br></p>') ? '' : incomingHtml;
      const normalizedEditorHtml = (currentEditorHtml === '<p><br></p>') ? '' : currentEditorHtml;
      
      if (normalizedEditorHtml !== normalizedIncomingHtml) {
        // Convert the incoming HTML prop 'value' to a Delta.
        const delta = quill.clipboard.convert(incomingHtml as any); // Use 'as any' because Quill's types can be tricky here
        quill.setContents(delta, 'silent'); // Use 'silent' to prevent 'text-change' from firing for this programmatic change
      }
    } catch (e) {
      console.error("Error synchronizing Quill content from 'value' prop:", e, "Incoming HTML value:", value);
    }
  }, [value, isClient]); // Trigger this effect when 'value' prop or 'isClient' status changes


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
