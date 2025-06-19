
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
  
  // This ref helps to distinguish between changes originating from user input
  // within the editor and changes coming from the parent component's `value` prop.
  const isProgrammaticChangeRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    console.log("[RTE-MountEffect] Component mounted, isClient set to true.");
  }, []);

  // Effect for Quill Initialization & attaching event listeners
  useEffect(() => {
    if (!isClient || !quillRef.current) {
      console.log("[RTE-InitEffect] Not client-side or quillRef not available. Aborting Quill initialization.");
      return;
    }

    let quill: Quill;

    if (!quillInstanceRef.current) { // Initialize Quill only once
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
      quill = new Quill(quillRef.current, options);
      quillInstanceRef.current = quill;

      // Set initial content if `value` prop is provided when Quill initializes
      const initialHtml = typeof value === 'string' ? value : '';
      console.log("[RTE-InitEffect] Initial `value` prop during Quill init:", JSON.stringify(initialHtml));
      if (initialHtml && quill.getLength() <= 1) { // Editor is essentially empty
        console.log("[RTE-InitEffect] Attempting to set initial content from `value` prop.");
        isProgrammaticChangeRef.current = true; // Mark as programmatic change
        try {
          const delta = quill.clipboard.convert(initialHtml as any);
          console.log("[RTE-InitEffect] Converted initial HTML to Delta:", JSON.stringify(delta));
          if (delta && delta.ops && (delta.ops.length > 1 || (delta.ops.length === 1 && delta.ops[0]?.insert !== '\n'))) {
             quill.setContents(delta, 'silent'); // Use 'silent' to avoid firing text-change
             console.log("[RTE-InitEffect] Initial content successfully set in Quill editor.");
          } else {
             console.log("[RTE-InitEffect] Initial Delta was empty or just a newline. Not setting content.");
          }
        } catch (e) {
            console.error("[RTE-InitEffect] Error setting initial Quill content from `value` prop:", e, "Input HTML was:", initialHtml);
        } finally {
            // It's important to reset this flag shortly after, or ensure the next value prop change
            // can still be processed if it's different from this initial set.
            // For initial set, this flag primarily prevents an immediate echo if text-change fires.
            // A timeout can ensure it's reset after the current JS execution cycle.
            setTimeout(() => { isProgrammaticChangeRef.current = false; }, 0);
        }
      } else {
         console.log("[RTE-InitEffect] No initial content to set (value was empty or editor not empty). Quill length:", quill.getLength());
      }
    } else {
      quill = quillInstanceRef.current;
      console.log("[RTE-InitEffect] Quill instance already exists.");
    }

    // Handler for when text changes in the editor
    const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
      console.log("[RTE-Event] 'text-change' event fired. Source:", source);
      
      if (isProgrammaticChangeRef.current) {
        console.log("[RTE-Event] 'text-change' ignored because isProgrammaticChangeRef is true.");
        // Reset the flag if it was a programmatic change that still triggered text-change
        // (though 'silent' source in setContents should prevent this for 'user' source check).
        // This specific reset might not be strictly necessary if 'silent' is always used for programmatic changes
        // and we only react to source === 'user'.
        // isProgrammaticChangeRef.current = false; 
        return;
      }

      if (source === 'user') { // Only process changes made by the user
        console.log("[RTE-Event] User edit detected.");
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') { // Normalize Quill's empty state
          html = '';
        }
        console.log("[RTE-Event] Propagating user change to parent component via onChange. HTML:", JSON.stringify(html));
        onChange(html); // Propagate the new HTML content to the parent component
      }
    };

    quill.on('text-change', handleChange);
    console.log("[RTE-InitEffect] 'text-change' listener attached.");

    // Cleanup function
    return () => {
      console.log("[RTE-Cleanup] Cleaning up 'text-change' listener.");
      quill.off('text-change', handleChange);
      // Do not destroy quillInstanceRef.current here. It might be needed if component re-renders without full unmount.
    };
  // isClient ensures client-side execution. onChange & placeholder are stable.
  // `value` is included for the initial content logic.
  }, [isClient, onChange, placeholder, value]);


  // Effect for Synchronizing with External `value` Prop Changes (e.g., from AI)
  useEffect(() => {
    const quill = quillInstanceRef.current;
    console.log("[RTE-ValueSyncEffect] Triggered. isClient:", isClient, "Quill ready:", !!quill);

    if (!isClient || !quill) {
      console.log("[RTE-ValueSyncEffect] Quill not ready or not client-side. Aborting sync.");
      return;
    }
    
    // This effect runs if `value` prop changes from parent.
    // We need to distinguish this from the initial `value` handled during init.
    // The `isProgrammaticChangeRef` helps avoid re-applying if the change was an echo.

    const incomingHtml = typeof value === 'string' ? value : '';
    const editorCurrentHtml = quill.root.innerHTML;

    // Normalize HTML strings for reliable comparison
    const normalizeHtml = (html: string) => (html === '<p><br></p>' || html.trim() === '' ? '' : html);
    const normalizedIncomingHtml = normalizeHtml(incomingHtml);
    const normalizedEditorCurrentHtml = normalizeHtml(editorCurrentHtml);
    
    console.log("[RTE-ValueSyncEffect] Comparing content. Normalized Incoming HTML:", JSON.stringify(normalizedIncomingHtml), "Normalized Editor Current HTML:", JSON.stringify(normalizedEditorCurrentHtml));

    if (normalizedIncomingHtml !== normalizedEditorCurrentHtml) {
      console.log("[RTE-ValueSyncEffect] Content differs. Attempting to set new content to Quill editor.");
      isProgrammaticChangeRef.current = true; // Signal that the next 'text-change' might be from this
      try {
        const delta = quill.clipboard.convert(incomingHtml as any);
        console.log("[RTE-ValueSyncEffect] Converted incoming HTML to Delta:", JSON.stringify(delta));

        if (delta && delta.ops && (delta.ops.length > 1 || (delta.ops.length === 1 && delta.ops[0]?.insert !== '\n'))) {
          quill.setContents(delta, 'silent'); // Use 'silent' to prevent firing text-change for this update
          console.log("[RTE-ValueSyncEffect] Quill content updated via setContents with non-empty Delta.");
        } else if (normalizedIncomingHtml === '') {
           quill.setContents([], 'silent'); 
           console.log("[RTE-ValueSyncEffect] Incoming HTML was empty (normalized), explicitly cleared Quill editor content.");
        } else {
          console.warn("[RTE-ValueSyncEffect] Delta conversion resulted in an empty/invalid Delta, but incoming HTML was not empty. Incoming HTML:", JSON.stringify(incomingHtml));
        }
      } catch (e) {
        console.error("[RTE-ValueSyncEffect] Error during Delta conversion or setContents in Quill:", e, "Problematic Incoming HTML was:", incomingHtml);
      } finally {
        // Crucially, reset the flag after this operation, typically after a microtask delay
        // to ensure Quill has processed the change and any immediate 'text-change' events
        // from this programmatic update (if 'silent' wasn't perfectly effective) are caught.
        setTimeout(() => {
            isProgrammaticChangeRef.current = false;
            console.log("[RTE-ValueSyncEffect] isProgrammaticChangeRef reset to false after timeout.");
        }, 0);
      }
    } else {
      console.log("[RTE-ValueSyncEffect] Content is the same (after normalization). No update to Quill editor needed.");
      // If content is same, ensure flag is false if it was somehow left true
      isProgrammaticChangeRef.current = false;
    }
  // This effect MUST react to `value` prop changes to handle external updates.
  // `isClient` is a guard to ensure operations run only on the client.
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
