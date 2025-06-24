
'use server';
/**
 * @fileOverview An AI agent for generating full blog posts.
 *
 * - generateBlogPost - A function that generates a blog post title and HTML content.
 * - GenerateBlogPostInput - The input type for the generateBlogPost function.
 * - GenerateBlogPostOutput - The return type for the generateBlogPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The main topic, a detailed prompt, or keywords for the blog post. Be as specific or brief as you like.'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('A compelling and SEO-friendly title for the blog post.'),
  htmlContent: z.string().describe('The full content of the blog post, formatted in HTML (e.g., using <p>, <h2>, <h3>, <strong>, <em> tags). This HTML should be ready to be displayed in a rich text editor or browser.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBlogPostPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: GenerateBlogPostOutputSchema},
  prompt: `You are an expert blog writer, renowned for crafting engaging, informative, and exceptionally human-like content. Your writing style must be natural, conversational, and indistinguishable from content written by a human.

Key requirements for your writing:
- **Tone**: Authoritative yet approachable and engaging. Use a friendly and relatable voice.
- **Language**: Employ varied vocabulary and sentence structures. Strictly avoid repetitive phrases, clichés, overly formal or academic language, and any patterns that might suggest AI generation (e.g., "In conclusion...", "It is important to note...", "Furthermore...", "The digital age...", "In today's fast-paced world...").
- **Structure**: Ensure the blog post is well-organized with a clear introduction that hooks the reader, a body with logical paragraph breaks and potentially 2-3 subheadings (using <h2> or <h3>), and a natural-sounding conclusion that summarizes key takeaways or offers a final thought.
- **Formatting**: Generate the blog content in HTML. Use appropriate HTML tags such as <p> for paragraphs, <h2> and <h3> for subheadings, <strong> for bold text, and <em> for italic text. Do NOT include <html>, <head>, or <body> tags. The HTML should be clean and ready for direct use in a rich text editor.
- **Markdown**: Strictly avoid using any Markdown syntax (e.g., # for headings, * or _ for emphasis). All formatting must be done exclusively with the specified HTML tags.
- **Title**: Create a compelling, concise, and SEO-friendly title. The title MUST be plain text and should NOT contain any markdown characters (like *, _, #) or HTML tags.
- **Content Quality**: Ensure the content is original, insightful, and provides real value to the reader. Be creative and think outside the box.

Based on the user-provided topic below, generate a complete blog post (title and HTML content) that meets all these requirements.

Topic/Prompt:
{{{topic}}}
`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate blog post content. The prompt might have been too vague or complex.");
    }

    // --- Sanitize HTML Content ---
    // Convert any stray Markdown formatting from the AI into proper HTML tags.
    // The order of replacement is important to prevent conflicts.
    let sanitizedHtmlContent = output.htmlContent;
    
    // BOLD + ITALIC: ***text*** or ___text___
    sanitizedHtmlContent = sanitizedHtmlContent.replace(/(\*\*\*|___)(.*?)\1/g, '<strong><em>$2</em></strong>');

    // BOLD: **text** or __text__
    sanitizedHtmlContent = sanitizedHtmlContent.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

    // ITALIC: *text* or _text_
    sanitizedHtmlContent = sanitizedHtmlContent.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');


    // --- Sanitize Title ---
    // The title should be plain text. We strip any potential HTML tags and markdown characters.
    const sanitizedTitle = output.title
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .replace(/[*_#]/g, '');   // Remove markdown characters

    return {
      title: sanitizedTitle.trim(),
      htmlContent: sanitizedHtmlContent,
    };
  }
);
