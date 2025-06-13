
// src/ai/flows/generate-fridge-analysis.ts
'use server';

/**
 * @fileOverview Generates analysis and recommendations for an industrial fridge based on temperature logs and observations.
 *
 * - generateFridgeAnalysis - A function that generates fridge performance analysis.
 * - FridgeAnalysisInput - The input type for the generateFridgeAnalysis function.
 * - FridgeAnalysisOutput - The return type for the generateFridgeAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FridgeAnalysisInputSchema = z.object({
  monthYear: z.string().describe("The month and year for which the analysis is being done (e.g., 'June 2025')."),
  morningTempStats: z.object({
    average: z.number().nullable().describe("Average morning temperature for the month in Celsius."),
    min: z.number().nullable().describe("Minimum morning temperature recorded during the month in Celsius."),
    max: z.number().nullable().describe("Maximum morning temperature recorded during the month in Celsius."),
    count: z.number().describe("Number of morning temperature readings."),
  }).describe("Statistical summary of morning temperature readings."),
  eveningTempStats: z.object({
    average: z.number().nullable().describe("Average evening temperature for the month in Celsius."),
    min: z.number().nullable().describe("Minimum evening temperature recorded during the month in Celsius."),
    max: z.number().nullable().describe("Maximum evening temperature recorded during the month in Celsius."),
    count: z.number().describe("Number of evening temperature readings."),
  }).describe("Statistical summary of evening temperature readings."),
  fridgeObservations: z.string().optional().describe('User observations about the fridge performance, e.g., frost buildup, door seal issues, unusual noises, contents loaded recently, power outages experienced.'),
});
export type FridgeAnalysisInput = z.infer<typeof FridgeAnalysisInputSchema>;

const FridgeAnalysisOutputSchema = z.object({
  temperatureStability: z.string().describe('Assessment of the fridge temperature stability, considering fluctuations and consistency across morning and evening readings. Comment on whether the min/max ranges are acceptable.'),
  potentialReagentRisks: z.string().describe('Discussion of potential risks to sensitive reagents based on the temperature patterns and observations. Specifically mention if data suggests temperatures are outside common safe storage ranges for general lab reagents (e.g., typically 2-8°C for refrigeration).'),
  maintenanceRecommendations: z.string().describe('Actionable maintenance suggestions (e.g., check door seals, defrost if observations suggest frost, verify thermostat calibration, or recommend professional servicing if issues are severe or persistent) based on data and user observations.'),
  overallAssessment: z.string().describe('A brief overall summary of the fridge performance for the month and any critical alerts or immediate concerns based on the data.'),
});
export type FridgeAnalysisOutput = z.infer<typeof FridgeAnalysisOutputSchema>;

export async function generateFridgeAnalysis(input: FridgeAnalysisInput): Promise<FridgeAnalysisOutput> {
  return generateFridgeAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fridgeAnalysisPrompt',
  input: {schema: FridgeAnalysisInputSchema},
  output: {schema: FridgeAnalysisOutputSchema},
  prompt: `You are a laboratory equipment specialist, an expert in industrial fridge maintenance and reagent storage.
Analyze the provided temperature log data and user observations for a reagent storage fridge for the month of {{monthYear}}.

Temperature Data:
Morning Readings ({{morningTempStats.count}} total):
- Average: {{#if morningTempStats.average}}{{morningTempStats.average}}°C{{else}}N/A{{/if}}
- Minimum: {{#if morningTempStats.min}}{{morningTempStats.min}}°C{{else}}N/A{{/if}}
- Maximum: {{#if morningTempStats.max}}{{morningTempStats.max}}°C{{else}}N/A{{/if}}

Evening Readings ({{eveningTempStats.count}} total):
- Average: {{#if eveningTempStats.average}}{{eveningTempStats.average}}°C{{else}}N/A{{/if}}
- Minimum: {{#if eveningTempStats.min}}{{eveningTempStats.min}}°C{{else}}N/A{{/if}}
- Maximum: {{#if eveningTempStats.max}}{{eveningTempStats.max}}°C{{else}}N/A{{/if}}

User Observations:
{{#if fridgeObservations}}{{fridgeObservations}}{{else}}No specific observations provided.{{/if}}

Based on this information, provide a structured analysis covering the following:
1.  Temperature Stability: Assess the stability. Are the fluctuations within acceptable limits for reagent storage? Is there a significant difference between min/max temperatures?
2.  Potential Reagent Risks: Identify any potential risks to reagents. Common refrigerated reagents require a 2-8°C range. Highlight any deviations or concerning patterns.
3.  Maintenance Recommendations: Suggest actionable maintenance based on the data and observations (e.g., defrosting, seal checks, thermostat calibration).
4.  Overall Assessment: Give a concise summary of the fridge's performance for the month.

Generate the output according to the defined schema. Be specific and practical in your advice.
`,
});

const generateFridgeAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFridgeAnalysisFlow',
    inputSchema: FridgeAnalysisInputSchema,
    outputSchema: FridgeAnalysisOutputSchema,
  },
  async (input: FridgeAnalysisInput) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI model did not return a valid output. Please try again.');
    }
    return output;
  }
);

