
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, FileText, Thermometer, Sigma, ArrowDown, ArrowUp } from 'lucide-react';
import { generateFridgeAnalysis, FridgeAnalysisInput, FridgeAnalysisOutput } from '@/ai/flows/generate-fridge-analysis';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { TemperatureLog } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const insightsSchema = z.object({
  fridgeObservations: z.string().optional().describe('User observations about the fridge performance, e.g., frost buildup, door seal issues, unusual noises, contents loaded recently, power outages experienced.'),
});

type InsightsFormData = z.infer<typeof insightsSchema>;

interface TempStats {
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

const calculateStats = (temperatures: (number | null)[]): TempStats => {
  const validTemps = temperatures.filter(temp => temp !== null) as number[];
  if (validTemps.length === 0) {
    return { average: null, min: null, max: null, count: 0 };
  }
  const sum = validTemps.reduce((acc, temp) => acc + temp, 0);
  return {
    average: parseFloat((sum / validTemps.length).toFixed(1)),
    min: Math.min(...validTemps),
    max: Math.max(...validTemps),
    count: validTemps.length,
  };
};

type AIInsightsProps = {
  monthlyLogs: TemperatureLog[];
  monthName: string;
  year: number;
};

export default function AIInsights({ monthlyLogs, monthName, year }: AIInsightsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FridgeAnalysisOutput | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<InsightsFormData>({
    resolver: zodResolver(insightsSchema),
    defaultValues: {
      fridgeObservations: '',
    }
  });

  const onSubmit = async (data: InsightsFormData) => {
    setIsLoading(true);
    setAnalysisResult(null);

    if (monthlyLogs.length === 0) {
        toast({ title: 'Insufficient Data', description: 'No temperature data available for this month to generate insights.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }
    
    const morningTemps = monthlyLogs.map(log => log.morningTemperature);
    const eveningTemps = monthlyLogs.map(log => log.eveningTemperature);

    const morningTempStats = calculateStats(morningTemps);
    const eveningTempStats = calculateStats(eveningTemps);

    const aiInput: FridgeAnalysisInput = {
      monthYear: `${monthName} ${year}`,
      morningTempStats,
      eveningTempStats,
      fridgeObservations: data.fridgeObservations || undefined,
    };

    try {
      const result = await generateFridgeAnalysis(aiInput);
      setAnalysisResult(result);
      toast({ title: 'Fridge Analysis Generated!', description: 'Personalized insights are ready.' });
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      toast({
        title: 'Error Generating Analysis',
        description: error.message || 'Could not fetch AI analysis.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Sparkles className="mr-2 h-6 w-6 text-primary" />
          AI-Powered Fridge Analysis
        </CardTitle>
        <CardDescription>Get AI-driven insights into your fridge's performance and reagent storage conditions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="fridgeObservations" className="flex items-center mb-1">
              <FileText className="mr-2 h-4 w-4" />
              Fridge Observations (Optional)
            </Label>
            <Textarea
              id="fridgeObservations"
              {...register('fridgeObservations')}
              placeholder="e.g., Noticed frost buildup on back wall, door left slightly ajar overnight on the 15th, new batch of reagents loaded on the 5th..."
              rows={3}
            />
            {errors.fridgeObservations && <p className="text-sm text-destructive mt-1">{errors.fridgeObservations.message}</p>}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <> <LoadingSpinner size={16} /> <span className="ml-2">Generating Analysis...</span></>
            ) : 'Get AI Analysis'}
          </Button>
        </form>

        {analysisResult && (
          <div className="mt-6 space-y-4">
            <h4 className="font-headline text-lg font-semibold text-primary">Fridge Performance Analysis for {monthName} {year}:</h4>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center"><Thermometer className="mr-2 h-5 w-5"/>Temperature Stability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{analysisResult.temperatureStability}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center"><Sigma className="mr-2 h-5 w-5 text-destructive"/>Potential Reagent Risks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{analysisResult.potentialReagentRisks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center"><ArrowUp className="mr-2 h-5 w-5 text-green-600"/>Maintenance Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{analysisResult.maintenanceRecommendations}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center"><FileText className="mr-2 h-5 w-5"/>Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium whitespace-pre-line">{analysisResult.overallAssessment}</p>
              </CardContent>
            </Card>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

