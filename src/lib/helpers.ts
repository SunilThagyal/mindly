
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200; 
  let textContent = content;

  // Check if content is likely HTML
  if (/<[a-z][\s\S]*>/i.test(content)) {
    // For client-side environments where DOMParser is available
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        textContent = doc.body.textContent || "";
      } catch (e) {
        // Fallback for environments where DOMParser might fail or is not robust
        textContent = content.replace(/<[^>]+>/g, ' ');
      }
    } else {
      // Basic fallback for non-browser environments (e.g., simple server-side script)
      textContent = content.replace(/<[^>]+>/g, ' ');
    }
  }

  // Remove leading/trailing whitespace and count words
  const noOfWords = textContent.trim().split(/\s+/g).filter(Boolean).length;
  const minutes = noOfWords / wordsPerMinute;
  return Math.ceil(minutes);
}
