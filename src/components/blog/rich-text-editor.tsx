
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
  // selfEditRef helps prevent an infinite loop when the editor's content
  // is updated by user input, which calls onChange, which updates the parent's
  // state, which then passes a new 'value' prop back to this component.
  const selfEditRef = useRef(false);

  useEffect(() => {
    // This effect runs once on mount to indicate client-side rendering is active.
    setIsClient(true);
    console.log("[RTE-MountEffect] Component mounted, isClient set to true.");
  }, []);

  // Effect for Quill Initialization & Initial Content
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
            ['link', 'image'], // Consider 'video' if needed
            ['clean']
          ],
          clipboard: { matchVisual: false }, // Recommended for predictable paste behavior
        },
        placeholder: placeholder || "Start writing...",
      };
      quill = new Quill(quillRef.current, options);
      quillInstanceRef.current = quill;

      // Set initial content if `value` prop is provided and editor is empty
      const incomingHtmlForInit = typeof value === 'string' ? value : '';
      if (incomingHtmlForInit && quill.getLength() <= 1) { // Check if editor is essentially empty (contains only a blank paragraph)
          console.log("[RTE-InitEffect] Setting initial content from 'value' prop during Quill initialization. HTML:", JSON.stringify(incomingHtmlForInit));
          try {
              const delta = quill.clipboard.convert(incomingHtmlForInit as any); // Convert HTML string to Delta
              console.log("[RTE-InitEffect] Converted initial HTML to Delta:", JSON.stringify(delta));
              if (delta && delta.ops && delta.ops.length > 0 && (delta.ops.length > 1 || (delta.ops[0] && delta.ops[0].insert !== '\n'))) { // Ensure delta is not empty or just a newline
                quill.setContents(delta, 'silent'); // 'silent' prevents firing text-change for this programmatic update
                console.log("[RTE-InitEffect] Initial content successfully set in Quill editor.");
              } else {
                console.log("[RTE-InitEffect] Initial Delta was empty or represented no actual content. Not setting content.");
              }
          } catch (e) {
              console.error("[RTE-InitEffect] Error setting initial Quill content from 'value' prop:", e, "Input HTML was:", incomingHtmlForInit);
          }
      } else {
        console.log("[RTE-InitEffect] No initial content to set from 'value' prop, or editor not empty. Incoming HTML:", JSON.stringify(incomingHtmlForInit), "Quill length:", quill.getLength());
      }
    } else {
      quill = quillInstanceRef.current;
      console.log("[RTE-InitEffect] Quill instance already exists.");
    }

    // Handler for when text changes in the editor due to user input
    const handleChange = (delta: any, oldDelta: any, source: string) => {
      console.log("[RTE-Event] 'text-change' event fired. Source:", source);
      if (source === 'user') { // Only process changes made by the user
        console.log("[RTE-Event] User edit detected. Setting selfEditRef to true.");
        selfEditRef.current = true; // Mark that this change originates from within the editor
        
        let html = quill.root.innerHTML;
        // Quill often represents an empty editor as '<p><br></p>'. Normalize this to an empty string.
        if (html === '<p><br></p>') {
          html = '';
        }
        console.log("[RTE-Event] Propagating user change to parent component via onChange. HTML:", JSON.stringify(html));
        onChange(html); // Propagate the new HTML content to the parent component
      }
    };

    quill.on('text-change', handleChange);
    console.log("[RTE-InitEffect] 'text-change' listener attached.");

    // Cleanup function: remove the listener when the component unmounts or dependencies change
    return () => {
      console.log("[RTE-Cleanup] Cleaning up 'text-change' listener.");
      quill.off('text-change', handleChange);
    };
  // This effect should run when `isClient` becomes true to initialize Quill.
  // `onChange` and `placeholder` are stable callbacks/props.
  // `value` is included for the initial content setting logic.
  }, [isClient, onChange, placeholder, value]);


  // Effect for Synchronizing with External `value` Prop Changes (e.g., from AI)
  useEffect(() => {
    const quill = quillInstanceRef.current;
    console.log("[RTE-ValueSyncEffect] Triggered. isClient:", isClient, "Quill ready:", !!quill, "selfEditRef:", selfEditRef.current);

    if (!isClient || !quill) {
      console.log("[RTE-ValueSyncEffect] Quill not ready or not client-side. Aborting sync.");
      return;
    }

    // If selfEditRef is true, it means the 'value' prop change is an echo of a user edit
    // that was just propagated up. We should not re-apply it to prevent loops.
    if (selfEditRef.current) {
      console.log("[RTE-ValueSyncEffect] Change originated from user input (selfEditRef is true). Resetting flag and skipping update to prevent loop.");
      selfEditRef.current = false; // Reset the flag for the next external update
      return;
    }

    // If selfEditRef is false, this is a genuine external update to the 'value' prop.
    console.log("[RTE-ValueSyncEffect] External update detected for 'value' prop. Incoming prop value:", JSON.stringify(value));
    
    const incomingHtml = typeof value === 'string' ? value : '';
    const editorCurrentHtml = quill.root.innerHTML;

    // Normalize HTML strings for reliable comparison, especially empty states.
    const normalizeHtml = (html: string) => (html === '<p><br></p>' || html.trim() === '' ? '' : html);
    const normalizedIncomingHtml = normalizeHtml(incomingHtml);
    const normalizedEditorCurrentHtml = normalizeHtml(editorCurrentHtml);
    
    console.log("[RTE-ValueSyncEffect] Normalized Incoming HTML for comparison:", JSON.stringify(normalizedIncomingHtml));
    console.log("[RTE-ValueSyncEffect] Normalized Editor Current HTML for comparison:", JSON.stringify(normalizedEditorCurrentHtml));

    // Only update Quill if the normalized content is actually different.
    if (normalizedIncomingHtml !== normalizedEditorCurrentHtml) {
      console.log("[RTE-ValueSyncEffect] Content differs. Attempting to set new content to Quill editor.");
      try {
        const delta = quill.clipboard.convert(incomingHtml as any); // Convert incoming HTML to Delta format
        console.log("[RTE-ValueSyncEffect] Converted incoming HTML to Delta:", JSON.stringify(delta));

        // Check if the conversion resulted in a meaningful Delta
        // or if the intent was to clear the editor.
        if (delta && delta.ops && delta.ops.length > 0 && (delta.ops.length > 1 || (delta.ops[0] && delta.ops[0].insert !== '\n'))) {
          quill.setContents(delta, 'silent'); // Use 'silent' to prevent firing text-change for this update
          console.log("[RTE-ValueSyncEffect] Quill content updated via setContents with non-empty Delta.");
        } else if (normalizedIncomingHtml === '') {
           // If the incoming HTML was empty (after normalization), explicitly set an empty Delta.
           quill.setContents([], 'silent'); 
           console.log("[RTE-ValueSyncEffect] Incoming HTML was empty (normalized), explicitly cleared Quill editor content.");
        } else {
          // This case means incoming HTML was not empty, but Delta conversion resulted in something Quill considers "empty" or invalid.
          // This might happen with malformed HTML or HTML structures Quill's converter doesn't handle well.
          console.warn("[RTE-ValueSyncEffect] Delta conversion resulted in an empty/invalid Delta, but incoming HTML was not empty. This might indicate problematic HTML from the source. Incoming HTML:", JSON.stringify(incomingHtml));
        }
      } catch (e) {
        // Catch errors during Delta conversion or setting content.
        console.error("[RTE-ValueSyncEffect] Error during Delta conversion or setContents in Quill:", e, "Problematic Incoming HTML was:", incomingHtml);
      }
    } else {
      console.log("[RTE-ValueSyncEffect] Content is the same (after normalization). No update to Quill editor needed.");
    }
  // This effect MUST react to `value` prop changes to handle external updates.
  // `isClient` is a guard to ensure operations run only on the client.
  }, [value, isClient]); 


  // Show skeleton loader if not client-side yet (Quill only runs in browser)
  if (!isClient) {
    console.log("[RTE-Render] Not client-side yet, rendering Skeleton.");
    return (
      <div className="space-y-2 quill-editor-override">
        <Skeleton className="h-10 w-full" /> {/* Mimics toolbar */}
        <Skeleton className="h-48 w-full rounded-b-lg border border-input" /> {/* Mimics editor area */}
      </div>
    );
  }

  // Render the div for Quill to attach to
  return (
    <div className="quill-editor-override">
      <div ref={quillRef} style={{ minHeight: '200px' }} />
    </div>
  );
};

export default RichTextEditor;
