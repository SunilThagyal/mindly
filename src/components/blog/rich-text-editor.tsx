
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Quill, { type QuillOptions, type DeltaStatic, type Sources } from 'quill';
import 'quill/dist/quill.snow.css';
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

  const internalUpdateRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    console.log("[RTE-MountEffect] Component mounted, isClient set to true.");
  }, []);

  useEffect(() => {
    if (!isClient || !quillRef.current || quillInstanceRef.current) {
      console.log("[RTE-InitEffect] Guard: Not client-side, quillRef not available, or Quill already initialized. Aborting.");
      return;
    }

    // Updated fontWhitelist to remove the generic 'sans-serif'
    // 'false' will represent the default font, which is typically sans-serif.
    // Specific sans-serif fonts like Montserrat, Arial, etc., are still available.
    const fontWhitelist = [
      false, // Default font (editor's base style)
      'serif',      // Generic Serif
      'monospace',  // Generic Monospace
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', // Common system fonts
      'Montserrat', 'Merriweather', 'Lora', // App specific fonts
      'Inter', 'Poppins', // Previous app fonts, kept for compatibility if content exists
      'Courier New',
    ];
    const sizeWhitelist = ['small', false, 'large', 'huge']; // Standard sizes

    console.log("[RTE-InitEffect] Initializing Quill instance.");
    const options: QuillOptions = {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'font': fontWhitelist }, { 'size': sizeWhitelist }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'], // code-block option is here
          ['link', 'image', 'video'],
          ['clean']
        ],
        clipboard: { matchVisual: false },
      },
      placeholder: placeholder || "Start writing your amazing blog post here...",
    };
    const quill = new Quill(quillRef.current, options);
    quillInstanceRef.current = quill;
    console.log("[RTE-InitEffect] Quill instance created.");

    const initialHtml = typeof value === 'string' ? value : '';
    console.log("[RTE-InitEffect] Initial `value` prop during Quill init:", JSON.stringify(initialHtml.substring(0,100) + "..."));

    if (initialHtml && quill.getLength() <= 1 && initialHtml !== "<p><br></p>") {
      console.log("[RTE-InitEffect] Attempting to set initial content from `value` prop using dangerouslyPasteHTML.");
      try {
        quill.clipboard.dangerouslyPasteHTML(0, initialHtml, 'silent');
        console.log("[RTE-InitEffect] Initial content successfully set in Quill editor.");
      } catch (e) {
        console.error("[RTE-InitEffect] Error setting initial Quill content:", e, "Input HTML was:", initialHtml.substring(0,100) + "...");
      }
    } else {
       console.log("[RTE-InitEffect] No initial content to set (value empty, editor not empty, or value is default empty paragraph). Quill length:", quill.getLength(), "Normalized Initial HTML for check:", initialHtml === "<p><br></p>" ? "" : initialHtml);
    }

    const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
      console.log("[RTE-Event] 'text-change' event fired. Source:", source);
      if (source === 'user') {
        console.log("[RTE-Event] User edit detected.");
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') {
          html = '';
        }
        console.log("[RTE-Event] Marking internalUpdateRef=true and calling onChange. HTML:", JSON.stringify(html.substring(0,100) + "..."));
        internalUpdateRef.current = true;
        onChange(html);
      }
    };

    quill.on('text-change', handleChange);
    console.log("[RTE-InitEffect] 'text-change' listener attached.");

    return () => {
      console.log("[RTE-Cleanup] Cleaning up 'text-change' listener.");
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change', handleChange);
      }
    };
  // Added `value` to deps here to ensure initial content gets set if value is ready on first client render.
  }, [isClient, onChange, placeholder, value]);


  useEffect(() => {
    const quill = quillInstanceRef.current;
    console.log("[RTE-ValueSyncEffect] Triggered. isClient:", isClient, "Quill ready:", !!quill);

    if (!isClient || !quill) {
      console.log("[RTE-ValueSyncEffect] Guard: Not client or Quill not ready.");
      return;
    }

    if (internalUpdateRef.current) {
      console.log("[RTE-ValueSyncEffect] Guard: Internal update, resetting flag and returning.");
      internalUpdateRef.current = false;
      return;
    }

    const incomingHtml = typeof value === 'string' ? value : '';
    let currentEditorHtml = quill.root.innerHTML;

    // Normalize empty states for comparison
    const normalizedIncomingHtml = (incomingHtml === "<p><br></p>") ? "" : incomingHtml;
    const normalizedCurrentEditorHtml = (currentEditorHtml === "<p><br></p>") ? "" : currentEditorHtml;

    console.log("[RTE-ValueSyncEffect] Comparing content. Normalized Incoming HTML:", JSON.stringify(normalizedIncomingHtml.substring(0,100) + "..."), "Normalized Editor Current HTML:", JSON.stringify(normalizedCurrentEditorHtml.substring(0,100) + "..."));

    if (normalizedIncomingHtml !== normalizedCurrentEditorHtml) {
      console.log("[RTE-ValueSyncEffect] Content differs. Attempting to update Quill editor.");
      try {
        // Directly paste the HTML. Quill's clipboard module handles conversion to Delta.
        quill.setContents([], 'silent'); // Clear current content silently first
        if (normalizedIncomingHtml) { // Only paste if there's actual content
            quill.clipboard.dangerouslyPasteHTML(0, normalizedIncomingHtml, 'silent');
            console.log("[RTE-ValueSyncEffect] Editor updated with dangerouslyPasteHTML. Pasted:", normalizedIncomingHtml.substring(0,100) + "...");
        } else {
            console.log("[RTE-ValueSyncEffect] Incoming HTML was empty, editor cleared.");
        }
      } catch (e) {
        console.error("[RTE-ValueSyncEffect] Error during content update in Quill:", e, "Problematic Incoming HTML was:", normalizedIncomingHtml.substring(0,100) + "...");
      }
    } else {
      console.log("[RTE-ValueSyncEffect] Content is the same. No update to Quill editor needed.");
    }
  }, [value, isClient]);


  if (!isClient) {
    console.log("[RTE-Render] Not client-side yet, rendering Skeleton.");
    return (
      <div className="space-y-2 quill-editor-override">
        <Skeleton className="h-10 w-full rounded-t-lg border-x border-t border-input" />
        <Skeleton className="h-60 w-full rounded-b-lg border border-input" />
      </div>
    );
  }

  return (
    <div className="quill-editor-override">
      <div ref={quillRef} style={{ minHeight: '250px' }} />
    </div>
  );
};

export default RichTextEditor;
