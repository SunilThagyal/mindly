
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

    let quill: Quill;

    if (!quillInstanceRef.current) {
      console.log("[RTE] Initializing Quill instance.");
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
         console.log("[RTE] Setting initial content from prop during init:", JSON.stringify(value));
         try {
           const delta = quill.clipboard.convert(value as any);
           quill.setContents(delta, 'silent');
         } catch (e) {
            console.error("[RTE] Error setting initial Quill content:", e, "HTML:", value);
         }
      }
    } else {
      quill = quillInstanceRef.current;
    }

    const handleChange = (delta: any, oldDelta: any, source: string) => {
      console.log("[RTE] text-change event. Source:", source);
      if (source === 'user') {
        console.log("[RTE] User edit detected. Setting selfEditRef to true.");
        selfEditRef.current = true;
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') {
          html = '';
        }
        console.log("[RTE] Propagating user change to parent:", JSON.stringify(html));
        onChange(html);
      }
    };

    quill.on('text-change', handleChange);

    return () => {
      console.log("[RTE] Cleaning up text-change listener.");
      quill.off('text-change', handleChange);
    };
  }, [isClient, onChange, placeholder, value]); // Added `value` here to ensure initial content is set if `value` is present on first client render.


  useEffect(() => {
    console.log("[RTE] useEffect for value sync. Value:", JSON.stringify(value), "isClient:", isClient);
    const quill = quillInstanceRef.current;
    if (!isClient || !quill) {
      console.log("[RTE] Quill instance or isClient not ready for prop sync. Aborting.");
      return;
    }

    if (selfEditRef.current) {
      console.log("[RTE] selfEditRef is true during prop sync. Resetting and aborting to prevent loop.");
      selfEditRef.current = false;
      return;
    }
    
    console.log("[RTE] External update detected for 'value' prop (selfEditRef is false).");

    try {
      const incomingHtml = typeof value === 'string' ? value : '';
      const currentEditorHtml = quill.root.innerHTML;

      const normalizedIncomingHtml = (incomingHtml === '<p><br></p>' || incomingHtml.trim() === '') ? '' : incomingHtml;
      const normalizedEditorHtml = (currentEditorHtml === '<p><br></p>' || currentEditorHtml.trim() === '') ? '' : currentEditorHtml;
      
      console.log("[RTE] Prop Sync - Normalized Incoming HTML:", JSON.stringify(normalizedIncomingHtml));
      console.log("[RTE] Prop Sync - Normalized Editor HTML:", JSON.stringify(normalizedEditorHtml));

      if (normalizedEditorHtml !== normalizedIncomingHtml) {
        console.log("[RTE] Prop Sync - Content differs. Attempting to set new content.");
        const delta = quill.clipboard.convert(incomingHtml as any); 
        console.log("[RTE] Prop Sync - Converted Delta:", JSON.stringify(delta));
        quill.setContents(delta, 'silent'); // 'silent' is crucial
        console.log("[RTE] Prop Sync - Set new content silently.");
      } else {
        console.log("[RTE] Prop Sync - Content is the same. No update needed.");
      }
    } catch (e) {
      console.error("[RTE] Prop Sync - Error synchronizing Quill content from 'value' prop:", e, "Incoming HTML value:", value);
    }
  // This effect specifically handles external changes to `value`.
  // The Quill initialization effect handles initial content.
  }, [value, isClient]); 


  if (!isClient) {
    return (
      <div className="space-y-2 quill-editor-override">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-b-lg border border-input" />
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
