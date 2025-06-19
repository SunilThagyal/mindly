
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Quill, { type QuillOptions, type DeltaStatic, type Sources } from 'quill';
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
  
  const internalUpdateRef = useRef(false); // To track if the update is from internal editor changes

  useEffect(() => {
    setIsClient(true);
    console.log("[RTE-MountEffect] Component mounted, isClient set to true.");
  }, []);

  // Effect for Quill Initialization & attaching event listeners
  useEffect(() => {
    if (!isClient || !quillRef.current || quillInstanceRef.current) {
      console.log("[RTE-InitEffect] Guard: Not client-side, quillRef not available, or Quill already initialized. Aborting.");
      return;
    }
    
    const fontWhitelist = [
      false, // Default system font
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', // Common system fonts
      'Inter', 'Poppins', // Our app's primary fonts
      'Courier New', 'monospace' // Monospace for code
    ];

    console.log("[RTE-InitEffect] Initializing Quill instance.");
    const options: QuillOptions = {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'font': fontWhitelist }, { 'size': [] }],
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
    const quill = new Quill(quillRef.current, options);
    quillInstanceRef.current = quill;
    console.log("[RTE-InitEffect] Quill instance created.");

    // Set initial content if `value` prop is provided and editor is empty
    const initialHtml = typeof value === 'string' ? value : '';
    console.log("[RTE-InitEffect] Initial `value` prop during Quill init:", JSON.stringify(initialHtml));
    if (initialHtml && quill.getLength() <= 1) {
      console.log("[RTE-InitEffect] Attempting to set initial content from `value` prop using dangerouslyPasteHTML.");
      try {
        quill.clipboard.dangerouslyPasteHTML(0, initialHtml, 'silent');
        console.log("[RTE-InitEffect] Initial content successfully set in Quill editor.");
      } catch (e) {
        console.error("[RTE-InitEffect] Error setting initial Quill content:", e, "Input HTML was:", initialHtml);
      }
    } else {
       console.log("[RTE-InitEffect] No initial content to set (value was empty or editor not empty). Quill length:", quill.getLength());
    }

    const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
      console.log("[RTE-Event] 'text-change' event fired. Source:", source);
      if (source === 'user') {
        console.log("[RTE-Event] User edit detected.");
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') { 
          html = '';
        }
        console.log("[RTE-Event] Marking internalUpdateRef=true and calling onChange. HTML:", JSON.stringify(html));
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
  }, [isClient, onChange, placeholder, value]);


  // Effect for Synchronizing with External `value` Prop Changes (e.g., from AI)
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
    if (currentEditorHtml === '<p><br></p>') {
      currentEditorHtml = '';
    }
    
    console.log("[RTE-ValueSyncEffect] Comparing content. Normalized Incoming HTML:", JSON.stringify(incomingHtml), "Normalized Editor Current HTML:", JSON.stringify(currentEditorHtml));

    if (incomingHtml !== currentEditorHtml) {
      console.log("[RTE-ValueSyncEffect] Content differs. Attempting to set new content to Quill editor.");
      try {
        quill.setContents([], 'silent'); // Clear current content silently
        if (incomingHtml) { 
            quill.clipboard.dangerouslyPasteHTML(0, incomingHtml, 'silent');
            console.log("[RTE-ValueSyncEffect] Editor updated with dangerouslyPasteHTML.");
        } else {
             console.log("[RTE-ValueSyncEffect] Incoming HTML was empty, editor cleared.");
        }
      } catch (e) {
        console.error("[RTE-ValueSyncEffect] Error during content update in Quill:", e, "Problematic Incoming HTML was:", incomingHtml);
      }
    } else {
      console.log("[RTE-ValueSyncEffect] Content is the same. No update to Quill editor needed.");
    }
  }, [value, isClient]);


  if (!isClient) {
    console.log("[RTE-Render] Not client-side yet, rendering Skeleton.");
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
