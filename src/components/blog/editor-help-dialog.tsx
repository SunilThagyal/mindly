
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Kbd } from '@/components/ui/kbd'; // Assuming Kbd is a custom component or will be styled

interface EditorHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditorHelpDialog({ isOpen, onClose }: EditorHelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Rich Text Editor Guide</DialogTitle>
          <DialogDescription>
            Learn how to use the various features of the content editor to create engaging blog posts.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 -mr-2"> {/* Negative margin to offset scrollbar */}
          <div className="space-y-5 text-sm py-2">
            <Section title="Basic Formatting">
              <Item name="Bold, Italic, Underline, Strikethrough">Select the text you want to format and click the corresponding button (e.g., <span className="font-bold">B</span>, <span className="italic">I</span>) in the toolbar.</Item>
              <Item name="Headings (H1, H2, H3)">Place your cursor where you want the heading, or select existing text. Then, choose a heading level (e.g., Heading 1) from the first dropdown in the toolbar.</Item>
            </Section>
            <Section title="Font & Text Styling">
              <Item name="Font Family">Select text and choose your desired font from the 'Font' dropdown menu (e.g., Montserrat, Merriweather).</Item>
              <Item name="Font Size">Select text and pick a size (e.g., Small, Normal, Large, Huge) from the 'Size' dropdown menu.</Item>
              <Item name="Text Color & Background Color">Highlight the text and use the 'A' (Text Color) or paint bucket (Background Color) icons in the toolbar to select colors.</Item>
            </Section>
            <Section title="Lists">
              <Item name="Ordered List (Numbered)">Click the numbered list icon (1, 2, 3) to start a numbered list. Press <Kbd>Enter</Kbd> for the next item, or <Kbd>Enter</Kbd> twice to end the list.</Item>
              <Item name="Bullet List (Bulleted)">Click the bulleted list icon (•, •, •) to start a bulleted list. Works similarly to ordered lists.</Item>
              <Item name="Checklist">Click the checklist icon (☐) to create interactive checklists. Click the box to toggle between checked (☑) and unchecked (☐).</Item>
            </Section>
            <Section title="Advanced Formatting">
              <Item name="Blockquote">To emphasize a quote, select the text or place your cursor and click the blockquote icon (usually a quotation mark <span className="font-serif text-lg">"</span> ).</Item>
              <Item name="Code Block">
                Used for displaying pre-formatted code snippets.
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>Click the code block icon (often <Kbd>&lt;/&gt;</Kbd> or similar) in the toolbar.</li>
                  <li>Type or paste your code into the появившийся блок. The editor will preserve spacing and formatting.</li>
                  <li><strong>To exit a code block</strong> and return to normal paragraph text:
                    <ul className="list-circle pl-5 text-xs">
                       <li>Place your cursor on an empty line at the end of the code block and press <Kbd>Enter</Kbd> again.</li>
                       <li>Alternatively, move your cursor to a new line below the code block and click the code block icon in the toolbar again to deactivate it. You can also select 'Paragraph' from the heading/block format dropdown.</li>
                    </ul>
                  </li>
                </ul>
              </Item>
              <Item name="Subscript & Superscript">Select the character or text, then click the <Kbd>x₂</Kbd> (subscript) or <Kbd>x²</Kbd> (superscript) buttons.</Item>
              <Item name="Indent & Outdent">Use the indent icons (arrows pointing right or left) to increase or decrease paragraph indentation, useful for structuring text or lists.</Item>
              <Item name="Text Alignment">Align text left, center, right, or justify it using the respective alignment icons in the toolbar.</Item>
            </Section>
            <Section title="Media & Links">
              <Item name="Insert Link">Select the text you want to hyperlink, click the link icon (🔗), paste the URL, and press <Kbd>Enter</Kbd> or click 'Save'.</Item>
              <Item name="Insert Image">Click the image icon. You can usually insert an image by providing its URL. Paste the image URL and confirm.</Item>
              <Item name="Embed Video">Click the video icon. Paste the video URL (e.g., from YouTube or Vimeo) into the prompt and confirm to embed the video player.</Item>
            </Section>
            <Section title="Utility">
              <Item name="Clean Formatting">If you paste text that has unwanted styling, select it and click the 'Remove Formatting' button (often an eraser or 'Tx' icon) to strip most styles and revert to default paragraph text.</Item>
            </Section>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="font-headline font-semibold mb-2 text-base text-primary">{title}</h4>
    <ul className="space-y-2.5 list-none">{children}</ul>
  </div>
);

const Item: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <li className="border-l-2 border-muted pl-3 py-1">
    <strong className="text-foreground block mb-0.5">{name}</strong>
    <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
  </li>
);

// Define Kbd component here or import if it's in ui/kbd.tsx
// const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
//   <kbd className="px-1.5 py-0.5 text-xs font-sans font-semibold text-foreground bg-muted border border-border rounded-sm shadow-sm">
//     {children}
//   </kbd>
// );
// For now, it's assumed Kbd is part of ui or will be styled directly for simplicity in this response.
// I'll use a simple span with kbd-like styling in the actual render.
// For the CDATA, I'll use a regular span styled to look like Kbd
