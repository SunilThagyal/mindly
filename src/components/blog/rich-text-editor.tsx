
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
          
          const currentContent = quill.getContents();
          let placeholderActualIndex = -1;
          let cumulativeIndex = 0;
          for (const op of currentContent.ops || []) {
            if (typeof op.insert === 'string') {
              const foundIndex = op.insert.indexOf(placeholderText);
              if (foundIndex !== -1) {
                placeholderActualIndex = cumulativeIndex + foundIndex;
                break;
              }
              cumulativeIndex += op.insert.length;
            } else {
              cumulativeIndex += 1; 
            }
          }
          
          if (placeholderActualIndex !== -1) {
            quill.deleteText(placeholderActualIndex, placeholderText.length, Quill.sources.SILENT);
          } else {
             quill.deleteText(range.index, placeholderText.length, Quill.sources.SILENT);
          }
          
          const insertionIndex = placeholderActualIndex !== -1 ? placeholderActualIndex : range.index;

          if (data.secure_url) {
            if (fileType === 'image') {
              quill.insertEmbed(insertionIndex, 'image', data.secure_url, Quill.sources.USER);
            } else if (fileType === 'video') {
              quill.clipboard.dangerouslyPasteHTML(insertionIndex, `<video src="${data.secure_url}" controls></video>`, Quill.sources.USER);
            }
            quill.setSelection(insertionIndex + 1, 0, Quill.sources.SILENT); 
            quill.insertText(insertionIndex + 1, '\n', Quill.sources.USER); 

          } else {
            let errorMsg = `Cloudinary ${fileType} upload failed.`;
            if (data.error?.message) {
                errorMsg += ` Error: ${data.error.message}.`;
            }
            throw new Error(errorMsg);
          }
        } catch (error) {
          console.error(`Cloudinary ${fileType} upload error:`, error);
          const currentContentOnError = quill.getContents();
          let placeholderIndexOnError = -1;
          let cumulativeIndexOnError = 0;
          for (const op of currentContentOnError.ops || []) {
            if (typeof op.insert === 'string') {
              const foundIndex = op.insert.indexOf(placeholderText);
              if (foundIndex !== -1) {
                placeholderIndexOnError = cumulativeIndexOnError + foundIndex;
                break;
              }
              cumulativeIndexOnError += op.insert.length;
            } else {
              cumulativeIndexOnError += 1;
            }
          }
          if (placeholderIndexOnError !== -1) {
            quill.deleteText(placeholderIndexOnError, placeholderText.length, Quill.sources.SILENT);
          } else {
             quill.deleteText(range.index, placeholderText.length, Quill.sources.SILENT);
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
        const currentSelection = quill.getSelection(); 
        quill.setContents([], 'silent'); 
        if (normalizedIncomingHtml) { 
            quill.clipboard.dangerouslyPasteHTML(0, normalizedIncomingHtml, 'silent');
        }
        if (currentSelection) { 
            const newLength = quill.getLength();
            if (currentSelection.index <= newLength) {
                 quill.setSelection(currentSelection.index, currentSelection.length, 'silent');
            } else {
                 quill.setSelection(newLength, 0, 'silent'); 
            }
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

