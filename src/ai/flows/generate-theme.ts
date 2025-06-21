'use server';
/**
 * @fileOverview An AI agent for generating website themes.
 *
 * - generateTheme - A function that generates theme settings based on a user prompt.
 * - GenerateThemeInput - The input type for the generateTheme function.
 * - GenerateThemeOutput - The return type for the generateTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// This is the structure we want the AI to return.
const GenerateThemeOutputSchema = z.object({
  primaryColor: z.string().describe('The primary color for buttons and active links, as an HSL string (e.g., "48 100% 50%").'),
  backgroundColor: z.string().describe('The main page background color, as an HSL string (e.g., "0 0% 98%").'),
  foregroundColor: z.string().describe('The main text color, as an HSL string (e.g., "0 0% 20%").'),
  cardColor: z.string().describe('The background color for cards and dialogs, as an HSL string (e.g., "0 0% 100%").'),
  cardForegroundColor: z.string().describe('The text color inside cards, as an HSL string (e.g., "0 0% 13%").'),
  secondaryColor: z.string().describe('The color for secondary UI elements like badges, as an HSL string (e.g., "0 0% 93%").'),
  accentColor: z.string().describe('The color for secondary actions and highlights, as an HSL string (e.g., "18 100% 50%").'),
  fontBody: z.string().describe('The font for body text. Must be a valid font name from the provided list.'),
  fontHeadline: z.string().describe('The font for headlines. Must be a valid font name from the provided list.'),
});
export type GenerateThemeOutput = z.infer<typeof GenerateThemeOutputSchema>;

const GenerateThemeInputSchema = z.object({
  prompt: z.string().describe('A text description of the desired theme (e.g., "dark and futuristic", "light and airy with a touch of nature").'),
});
export type GenerateThemeInput = z.infer<typeof GenerateThemeInputSchema>;

// The available fonts for the AI to choose from.
const AVAILABLE_FONTS = {
    "System": ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif", "Georgia", "Times New Roman", "serif", "Courier New", "monospace"],
    "Google Fonts": ["Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Merriweather", "Lora"],
};
const allFonts = [...AVAILABLE_FONTS["System"], ...AVAILABLE_FONTS["Google Fonts"]];


export async function generateTheme(input: GenerateThemeInput): Promise<GenerateThemeOutput> {
  return generateThemeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateThemePrompt',
  input: {schema: GenerateThemeInputSchema},
  output: {schema: GenerateThemeOutputSchema},
  prompt: `You are an expert UI/UX and theme designer. Your task is to generate a complete and harmonious website theme based on a user's description.

The theme includes a full color palette and font pairings.

**Color Requirements:**
- All colors MUST be returned in HSL string format: "H S% L%". For example, "210 40% 98%".
- The color palette must be aesthetically pleasing, accessible, and work well together.
- The foreground and background colors must have sufficient contrast.

**Font Requirements:**
- You must choose one font for headlines and one font for body text.
- The fonts MUST be selected from the following list of available fonts:
${allFonts.join(', ')}
- The font pairing should be harmonious and match the described theme. For example, for a "modern tech" theme, a sans-serif pairing like 'Inter' for headlines and 'Roboto' for body would be appropriate. For a "classic book" theme, a serif pairing like 'Lora' for headlines and 'Merriweather' for body would work well.

**User's Theme Description:**
"{{{prompt}}}"

Generate a complete theme based on this description.
`,
});


const generateThemeFlow = ai.defineFlow(
  {
    name: 'generateThemeFlow',
    inputSchema: GenerateThemeInputSchema,
    outputSchema: GenerateThemeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate theme settings. The prompt might have been too vague or complex.");
    }
    return output;
  }
);
