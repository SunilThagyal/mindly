
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import sanitizeHtml from 'sanitize-html';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const quillModule = await import('react-quill');
    const RQComponent = quillModule.default;
    // const Quill = quillModule.Quill; // Access Quill as a named export

    // Aggressively removing custom format registrations to avoid findDOMNode issues
    // if (Quill) {
    //   const Font = Quill.import('formats/font');
    //   Font.whitelist = ['arial', 'times-new-roman', 'roboto', 'belleza', 'alegreya', 'sans-serif', 'serif', 'monospace'];
    //   Quill.register(Font, true);

    //   const Size = Quill.import('formats/size');
    //   Size.whitelist = ['small', 'large', 'huge']; 
    //   Quill.register(Size, true);
      
    //   const AlignStyle = Quill.import('attributors/style/align');
    //   Quill.register(AlignStyle, true);
      
    //   const AlignClass = Quill.import('attributors/class/align');
    //   Quill.register(AlignClass, true);
    // }
    return RQComponent;
  },
  { 
    ssr: false, 
    loading: () => (
        <div className="space-y-2">
            <Skeleton className="h-10 w-full" /> {/* Mock Toolbar */}
            <Skeleton className="h-48 w-full" /> {/* Mock Editor Area */}
        </div>
    )
  }
);


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        // Removed font and size dropdowns as custom formats are not registered
        // [{ 'font': ['arial', 'times-new-roman', 'roboto', 'belleza', 'alegreya', 'sans-serif', 'serif', 'monospace'] }],
        // [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        // Removed align dropdown as custom align formats are not registered
        // [{ 'align': [] }], 
        ['blockquote', 'code-block'],
        ['link', 'image'], 
        ['clean']
      ],
    },
    clipboard: {
       matchVisual: false, 
    },
  }), []);

  const formats = [
    'header', 
    // 'font', 'size', // Removed
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'script', 'indent', 
    // 'align', // Removed
    'blockquote', 'code-block',
    'link', 'image'
  ];

  const sanitizeConfig: sanitizeHtml.IOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'h1', 'h2', 'h3', 'u', 's', 'sup', 'sub', 'img', 'span', 'div', 'br',
      'article', 'section', 'figure', 'figcaption' 
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['class', 'style', 'id', 'dir'], 
      'a': ['href', 'name', 'target', 'rel', 'title'],
      'img': ['src', 'alt', 'width', 'height', 'style', 'title', 'data-mce-src'], 
      'span': ['style', 'class'], 
      'p': ['style', 'class'], 
      'div': ['style', 'class'],
      'li': ['class'], 
      'ol': ['class'],
      'ul': ['class'],
    },
    allowedStyles: { 
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i, /^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*(0|1|0?\.\d+)\s*\)$/i, /^[a-z]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i, /^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*(0|1|0?\.\d+)\s*\)$/i, /^[a-z]+$/i],
        'font-size': [/^\d+(?:px|em|rem|%|pt|vw|vh)$/i, /^(xx-small|x-small|small|medium|large|x-large|xx-large)$/i],
        'font-family': [/.*/], 
        'text-align': [/^(left|right|center|justify)$/i],
        'margin': [/^\s*auto\s*$|^\s*\d+(px|em|%|pt)?(\s+\d+(px|em|%|pt)?){0,3}\s*$/i],
        'margin-left': [/^\s*auto\s*$|^\s*\d+(px|em|%|pt)?\s*$/i],
        'margin-right': [/^\s*auto\s*$|^\s*\d+(px|em|%|pt)?\s*$/i],
        'margin-top': [/^\s*auto\s*$|^\s*\d+(px|em|%|pt)?\s*$/i],
        'margin-bottom': [/^\s*auto\s*$|^\s*\d+(px|em|%|pt)?\s*$/i],
        'padding': [/^\s*\d+(px|em|%|pt)?(\s+\d+(px|em|%|pt)?){0,3}\s*$/i],
        'padding-left': [/^\s*\d+(px|em|%|pt)?\s*$/i],
        'padding-right': [/^\s*\d+(px|em|%|pt)?\s*$/i],
        'padding-top': [/^\s*\d+(px|em|%|pt)?\s*$/i],
        'padding-bottom': [/^\s*\d+(px|em|%|pt)?\s*$/i],
        'line-height': [/^\d*\.?\d+(?:px|em|%|pt)?$/i, /^[a-z-]+$/i],
        'text-decoration': [/^(underline|line-through|overline|none)$/i],
        'font-weight': [/^(bold|normal|\d+)$/i],
        'font-style': [/^(italic|normal|oblique)$/i],
        'display': [/^(block|inline|inline-block|none|flex|grid)$/i],
        'float': [/^(left|right|none)$/i],
        'width': [/^\d+(?:px|em|%|pt)?$/, 'auto'],
        'height': [/^\d+(?:px|em|%|pt)?$/, 'auto'],
      },
    },
    allowedSchemes: sanitizeHtml.defaults.allowedSchemes.concat(['data']), 
    exclusiveFilter: function(frame) { 
        return frame.tag === 'script' || frame.tag === 'style' || frame.tag === 'link' && frame.attribs.rel === 'stylesheet';
    },
    nonTextTags: [ 'style', 'script', 'textarea', 'noscript', 'button', 'iframe', 'embed', 'object', 'select', 'option' ],
    allowedClasses: {
        // Allow very basic Quill classes if any are still used by default formats
        '*': [ 'ql-*' ] 
    },
  };

  const handleChange = (html: string) => {
    const textContent = new DOMParser().parseFromString(html, "text/html").documentElement.textContent || "";
    if ((html === '<p><br></p>' || html === '') && textContent.trim() === '') {
      onChange(''); 
    } else {
      const cleanHtml = sanitizeHtml(html, sanitizeConfig);
      onChange(cleanHtml);
    }
  };

  if (!isClient) {
    return (
      <div className="space-y-2">
          <Skeleton className="h-10 w-full" /> 
          <Skeleton className="h-48 w-full" /> 
      </div>
    );
  }

  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={handleChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder || "Start writing..."}
      className="bg-card quill-editor-override"
    />
  );
};

export default RichTextEditor;
