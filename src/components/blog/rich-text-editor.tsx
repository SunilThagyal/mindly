
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
  
  // Ref to track if the current update to `value` prop originated from an internal editor change
  const internalUpdateRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    console.log("[RTE-MountEffect] Component mounted, isClient set to true.");
  }, []);

  // Effect for Quill Initialization & attaching event listeners
  useEffect(() => {
    if (!isClient || !quillRef.current || quillInstanceRef.current) { // Only initialize once
      console.log("[RTE-InitEffect] Guard: Not client-side, quillRef not available, or Quill already initialized. Aborting.");
      return;
    }

    console.log("[RTE-InitEffect] Initializing Quill instance.");
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
    const quill = new Quill(quillRef.current, options);
    quillInstanceRef.current = quill;
    console.log("[RTE-InitEffect] Quill instance created.");

    // Set initial content if `value` prop is provided and editor is empty
    const initialHtml = typeof value === 'string' ? value : '';
    console.log("[RTE-InitEffect] Initial `value` prop during Quill init:", JSON.stringify(initialHtml));
    if (initialHtml && quill.getLength() <= 1) { // Editor is essentially empty
      console.log("[RTE-InitEffect] Attempting to set initial content from `value` prop.");
      try {
        // Use dangerouslyPasteHTML for initial content as well for consistency
        quill.clipboard.dangerouslyPasteHTML(0, initialHtml, 'silent');
        console.log("[RTE-InitEffect] Initial content successfully set in Quill editor using dangerouslyPasteHTML.");
      } catch (e) {
        console.error("[RTE-InitEffect] Error setting initial Quill content with dangerouslyPasteHTML:", e, "Input HTML was:", initialHtml);
      }
    } else {
       console.log("[RTE-InitEffect] No initial content to set (value was empty or editor not empty). Quill length:", quill.getLength());
    }

    // Handler for when text changes in the editor
    const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
      console.log("[RTE-Event] 'text-change' event fired. Source:", source);
      if (source === 'user') {
        console.log("[RTE-Event] User edit detected.");
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') { // Normalize Quill's empty state
          html = '';
        }
        console.log("[RTE-Event] Marking internalUpdateRef=true and calling onChange. HTML:", JSON.stringify(html));
        internalUpdateRef.current = true; // Signal that the upcoming prop change is from internal editor
        onChange(html); // Propagate the new HTML content to the parent component
      }
    };

    quill.on('text-change', handleChange);
    console.log("[RTE-InitEffect] 'text-change' listener attached.");

    // Cleanup function
    return () => {
      console.log("[RTE-Cleanup] Cleaning up 'text-change' listener.");
      if (quillInstanceRef.current) { // Check if instance exists before calling off
        quillInstanceRef.current.off('text-change', handleChange);
        // Consider if quillInstanceRef.current should be set to null or editor destroyed
        // For simplicity here, we're just removing the listener.
        // If the component fully unmounts and Quill is not needed elsewhere,
        // you might want to fully destroy it.
      }
    };
  }, [isClient, onChange, placeholder, value]); // value is needed here for initial content


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
      internalUpdateRef.current = false; // Reset the flag
      return;
    }

    // The `value` prop has changed externally
    const incomingHtml = typeof value === 'string' ? value : '';
    let currentEditorHtml = quill.root.innerHTML;
    // Normalize Quill's empty state representation for comparison
    if (currentEditorHtml === '<p><br></p>') {
      currentEditorHtml = '';
    }
    
    console.log("[RTE-ValueSyncEffect] Comparing content. Normalized Incoming HTML:", JSON.stringify(incomingHtml), "Normalized Editor Current HTML:", JSON.stringify(currentEditorHtml));

    if (incomingHtml !== currentEditorHtml) {
      console.log("[RTE-ValueSyncEffect] Content differs. Attempting to set new content to Quill editor using dangerouslyPasteHTML.");
      try {
        quill.setContents([], 'silent'); // Clear current content silently
        if (incomingHtml) { // Only paste if there's actual incoming HTML
            quill.clipboard.dangerouslyPasteHTML(0, incomingHtml, 'silent'); // Paste new HTML at index 0
            console.log("[RTE-ValueSyncEffect] Editor updated with dangerouslyPasteHTML.");
        } else {
             console.log("[RTE-ValueSyncEffect] Incoming HTML was empty, editor cleared.");
        }
      } catch (e) {
        console.error("[RTE-ValueSyncEffect] Error during dangerouslyPasteHTML in Quill:", e, "Problematic Incoming HTML was:", incomingHtml);
      }
    } else {
      console.log("[RTE-ValueSyncEffect] Content is the same (after normalization). No update to Quill editor needed.");
    }
  }, [value, isClient]); // React to `value` and `isClient`.


  if (!isClient) {
    console.log("[RTE-Render] Not client-side yet, rendering Skeleton.");
    return (
      <div className="space-y-2 quill-editor-override">
        <Skeleton className="h-10 w-full" /> {/* Mimics toolbar */}
        <Skeleton className="h-48 w-full rounded-b-lg border border-input" /> {/* Mimics editor area */}
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
