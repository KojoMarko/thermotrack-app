// src/ai/flows/generate-health-recommendations.ts
'use server';

/**
 * @fileOverview Generates personalized health and wellness recommendations based on temperature data.
 *
 * - generateHealthRecommendations - A function that generates health recommendations based on temperature data.
 * - HealthRecommendationsInput - The input type for the generateHealthRecommendations function.
 * - HealthRecommendationsOutput - The return type for the generateHealthRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthRecommendationsInputSchema = z.object({
  morningTemperature: z.number().describe('The user\'s morning temperature in Celsius.'),
  eveningTemperature: z.number().describe('The user\'s evening temperature in Celsius.'),
  userLifestyle: z.string().describe('Description of user\'s lifestyle, daily routines and goals.'),
});
export type HealthRecommendationsInput = z.infer<typeof HealthRecommendationsInputSchema>;

const HealthRecommendationsOutputSchema = z.object({
  recommendations: z.string().describe('Personalized health and wellness recommendations based on the temperature data.'),
});
export type HealthRecommendationsOutput = z.infer<typeof HealthRecommendationsOutputSchema>;

export async function generateHealthRecommendations(input: HealthRecommendationsInput): Promise<HealthRecommendationsOutput> {
  return generateHealthRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthRecommendationsPrompt',
  input: {schema: HealthRecommendationsInputSchema},
  output: {schema: HealthRecommendationsOutputSchema},
  prompt: `You are a health and wellness advisor. Based on the user's temperature data and lifestyle, provide personalized recommendations to improve their well-being.\n\nMorning Temperature: {{morningTemperature}} °C\nEvening Temperature: {{eveningTemperature}} °C\nUser Lifestyle: {{userLifestyle}}\n\nRecommendations:`,
});

const generateHealthRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateHealthRecommendationsFlow',
    inputSchema: HealthRecommendationsInputSchema,
    outputSchema: HealthRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
