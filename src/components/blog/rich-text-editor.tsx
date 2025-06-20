
"use client";

import React, { useRef, useEffect, useState } from 'react';
import Quill, { type QuillOptions, type DeltaStatic, type Sources } from 'quill';
import 'quill/dist/quill.snow.css';
import { Skeleton } from '@/components/ui/skeleton';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/config/cloudinary'; 

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
  }, []);

  const commonUploadHandler = async (fileType: 'image' | 'video', acceptType: string) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name') {
      alert(`Cloudinary is not configured for ${fileType} uploads. Please check your environment settings and ensure NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is correctly set to your unsigned preset name.`);
      console.error(`Cloudinary config missing: CLOUDINARY_CLOUD_NAME or CLOUDINARY_UPLOAD_PRESET not set or is placeholder for ${fileType}s.`);
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', acceptType);
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      const quill = quillInstanceRef.current;
      if (file && quill) {
        const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 }; // Fallback if no selection
        const placeholderText = ` [Uploading ${fileType}...] `;
        quill.insertText(range.index, placeholderText, { color: 'grey', italic: true });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('resource_type', fileType === 'video' ? 'video' : 'image');


        try {
          const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${fileType}/upload`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          quill.deleteText(range.index, placeholderText.length); 

          if (data.secure_url) {
            if (fileType === 'image') {
              quill.insertEmbed(range.index, 'image', data.secure_url);
            } else if (fileType === 'video') {
              // Embed as HTML5 video tag
              const videoEmbed = `<video controls width="100%" src="${data.secure_url}"></video>`;
              quill.clipboard.dangerouslyPasteHTML(range.index, videoEmbed, 'user');
            }
            quill.setSelection(range.index + 1, 0); 
          } else {
            throw new Error(data.error?.message || `Cloudinary ${fileType} upload failed to return a secure_url.`);
          }
        } catch (error) {
          console.error(`Cloudinary ${fileType} upload error:`, error);
          quill.deleteText(range.index, placeholderText.length);
          alert(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} upload failed: ` + (error as Error).message);
        }
      }
    };
  };
  
  const imageHandler = () => commonUploadHandler('image', 'image/*');
  const videoHandler = () => commonUploadHandler('video', 'video/*');


  useEffect(() => {
    if (!isClient || !quillRef.current || quillInstanceRef.current) {
      return;
    }
    
    const fontWhitelist = [
      false, 
      'serif', 'monospace',
      'Montserrat', 'Merriweather', 'Lora', 
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New' 
    ];
    const sizeWhitelist = ['small', false, 'large', 'huge'];

    const options: QuillOptions = {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'font': fontWhitelist }, { 'size': sizeWhitelist }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'], 
            ['clean']
          ],
          handlers: {
            image: imageHandler,
            video: videoHandler, 
          }
        },
        clipboard: { matchVisual: false },
      },
      placeholder: placeholder || "Start writing your amazing blog post here...",
    };
    const quill = new Quill(quillRef.current, options);
    quillInstanceRef.current = quill;

    const initialHtml = typeof value === 'string' ? value : '';
    if (initialHtml && quill.getLength() <= 1 && initialHtml !== "<p><br></p>") {
      try {
        quill.clipboard.dangerouslyPasteHTML(0, initialHtml, 'silent');
      } catch (e) {
        console.error("[RTE-InitEffect] Error setting initial Quill content:", e);
      }
    }

    const handleChange = (delta: DeltaStatic, oldDelta: DeltaStatic, source: Sources) => {
      if (source === 'user') {
        let html = quill.root.innerHTML;
        if (html === '<p><br></p>') {
          html = '';
        }
        internalUpdateRef.current = true;
        onChange(html);
      }
    };

    quill.on('text-change', handleChange);

    return () => {
      if (quillInstanceRef.current) {
        quillInstanceRef.current.off('text-change', handleChange);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, placeholder]); 


  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!isClient || !quill) return;

    if (internalUpdateRef.current) {
      internalUpdateRef.current = false;
      return;
    }

    const incomingHtml = typeof value === 'string' ? value : '';
    let currentEditorHtml = quill.root.innerHTML;
    const normalizedIncomingHtml = (incomingHtml === "<p><br></p>") ? "" : incomingHtml;
    const normalizedCurrentEditorHtml = (currentEditorHtml === "<p><br></p>") ? "" : currentEditorHtml;

    if (normalizedIncomingHtml !== normalizedCurrentEditorHtml) {
      try {
        quill.setContents([], 'silent'); 
        if (normalizedIncomingHtml) { 
            quill.clipboard.dangerouslyPasteHTML(0, normalizedIncomingHtml, 'silent');
        }
      } catch (e) {
        console.error("[RTE-ValueSyncEffect] Error during content update in Quill:", e);
      }
    }
  }, [value, isClient]);


  if (!isClient) {
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
