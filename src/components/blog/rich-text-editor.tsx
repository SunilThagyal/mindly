
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

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  const [isClient, setIsClient] = useState(false);
  const internalUpdateRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const commonUploadHandler = async (fileType: 'image' | 'video') => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'blogchain_unsigned_preset' || CLOUDINARY_UPLOAD_PRESET === 'your_unsigned_upload_preset_name') {
      alert(`Cloudinary is not fully configured for ${fileType} uploads. 
Please check your environment variables:
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (Current: ${CLOUDINARY_CLOUD_NAME || 'Not Set'})
- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (Current: ${CLOUDINARY_UPLOAD_PRESET || 'Not Set'})
Ensure the preset is an 'unsigned' preset created in your Cloudinary dashboard. 
${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploads via the editor will not work until this is resolved.`);
      console.error(`Cloudinary config incomplete for ${fileType} uploads. Name: ${CLOUDINARY_CLOUD_NAME}, Preset: ${CLOUDINARY_UPLOAD_PRESET}`);
      return;
    }

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    const acceptType = fileType === 'image' ? ALLOWED_IMAGE_TYPES.join(',') : ALLOWED_VIDEO_TYPES.join(',');
    input.setAttribute('accept', acceptType);
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      const quill = quillInstanceRef.current;
      if (file && quill) {
        const allowedTypes = fileType === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
        if (!allowedTypes.includes(file.type)) {
          alert(`Invalid file type for ${fileType}. Allowed types: ${allowedTypes.join(', ')}`);
          return;
        }

        const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
        if (file.size > maxSize) {
          alert(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} file too large. Max size: ${maxSize / (1024 * 1024)}MB.`);
          return;
        }
        
        const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
        const placeholderText = ` [Uploading ${fileType}: ${file.name}...] `;
        quill.insertText(range.index, placeholderText, { color: 'grey', italic: true });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'blogs'); 
        formData.append('resource_type', fileType === 'video' ? 'video' : 'image');

        try {
          const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${fileType}/upload`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          
          const currentPlaceholderIndex = quill.getText().indexOf(placeholderText);
          if (currentPlaceholderIndex !== -1) {
            quill.deleteText(currentPlaceholderIndex, placeholderText.length);
          } else {
            quill.deleteText(range.index, placeholderText.length);
          }

          if (data.secure_url && data.width && data.height) {
            const aspectRatio = `${data.width} / ${data.height}`;
            const mediaElementTag = fileType === 'image' ? 'img' : 'video';
            
            const mainMediaAttributes = fileType === 'image' 
              ? `alt="${file.name || 'User uploaded content'}"` // Use file name as default alt
              : 'controls';
            const backgroundMediaAttributes = fileType === 'image'
              ? 'alt="" aria-hidden="true"'
              : 'autoplay muted loop playsinline aria-hidden="true"';

            const htmlToInsert = `
              <div class="blog-media-container" data-media-type="${fileType}" style="aspect-ratio: ${aspectRatio};">
                <${mediaElementTag}
                  src="${data.secure_url}"
                  class="blog-media-background-content"
                  ${backgroundMediaAttributes}
                ></${mediaElementTag}>
                <${mediaElementTag}
                  src="${data.secure_url}"
                  class="blog-media-main-content"
                  ${mainMediaAttributes}
                ></${mediaElementTag}>
              </div>
            `;
            quill.clipboard.dangerouslyPasteHTML(range.index, htmlToInsert, 'user');
            quill.setSelection(range.index + 1, 0); 
          } else {
            let errorMsg = `Cloudinary ${fileType} upload failed.`;
            if (data.error?.message) {
                errorMsg += ` Error: ${data.error.message}.`;
            } else if (!data.width || !data.height) {
                errorMsg += ` Missing width/height in Cloudinary response.`;
            } else {
                errorMsg += ` Check Cloudinary response for details.`;
            }
            throw new Error(errorMsg);
          }
        } catch (error) {
          console.error(`Cloudinary ${fileType} upload error:`, error);
          const currentPlaceholderIndexOnError = quill.getText().indexOf(placeholderText);
          if (currentPlaceholderIndexOnError !== -1) {
            quill.deleteText(currentPlaceholderIndexOnError, placeholderText.length);
          }
          alert(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} upload failed: ` + (error as Error).message);
        }
      }
    };
  };
  
  const imageHandler = () => commonUploadHandler('image');
  const videoHandler = () => commonUploadHandler('video');


  useEffect(() => {
    if (!isClient || !quillRef.current || quillInstanceRef.current) {
      return;
    }
    
    const fontWhitelist = [
      false, 
      'serif', 'monospace', // Generic fallbacks
      'Montserrat', 'Merriweather', 'Lora', // Theme fonts
      'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New' // Common web-safe fonts
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
        const currentSelection = quill.getSelection(); 
        quill.setContents([], 'silent'); 
        if (normalizedIncomingHtml) { 
            quill.clipboard.dangerouslyPasteHTML(0, normalizedIncomingHtml, 'silent');
        }
        if (currentSelection) { 
            quill.setSelection(currentSelection, 'silent');
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
