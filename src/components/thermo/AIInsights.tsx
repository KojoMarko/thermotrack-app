'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Brain } from 'lucide-react';
import { generateHealthRecommendations, HealthRecommendationsInput } from '@/ai/flows/generate-health-recommendations';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { TemperatureLog } from '@/lib/types';

const insightsSchema = z.object({
  userLifestyle: z.string().min(10, { message: 'Please describe your lifestyle in at least 10 characters.' }).max(500, { message: 'Lifestyle description cannot exceed 500 characters.' }),
});

type InsightsFormData = z.infer<typeof insightsSchema>;

type AIInsightsProps = {
  monthlyLogs: TemperatureLog[]; // Logs for the currently selected month
};

export default function AIInsights({ monthlyLogs }: AIInsightsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, register, formState: { errors } } = useForm<InsightsFormData>({
    resolver: zodResolver(insightsSchema),
  });

  const onSubmit = async (data: InsightsFormData) => {
    setIsLoading(true);
    setRecommendations(null);

    let avgMorningTemp = 0;
    let avgEveningTemp = 0;
    let morningCount = 0;
    let eveningCount = 0;

    monthlyLogs.forEach(log => {
      if (log.morningTemperature !== null) {
        avgMorningTemp += log.morningTemperature;
        morningCount++;
      }
      if (log.eveningTemperature !== null) {
        avgEveningTemp += log.eveningTemperature;
        eveningCount++;
      }
    });

    if (morningCount === 0 && eveningCount === 0) {
        toast({ title: 'Insufficient Data', description: 'No temperature data available for this month to generate insights.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }
    
    const finalAvgMorning = morningCount > 0 ? parseFloat((avgMorningTemp / morningCount).toFixed(1)) : 0; // Default to 0 if no data
    const finalAvgEvening = eveningCount > 0 ? parseFloat((avgEveningTemp / eveningCount).toFixed(1)) : 0; // Default to 0 if no data


    const aiInput: HealthRecommendationsInput = {
      morningTemperature: finalAvgMorning,
      eveningTemperature: finalAvgEvening,
      userLifestyle: data.userLifestyle,
    };

    try {
      const result = await generateHealthRecommendations(aiInput);
      setRecommendations(result.recommendations);
      toast({ title: 'Insights Generated!', description: 'Personalized recommendations are ready.' });
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      toast({
        title: 'Error Generating Insights',
        description: error.message || 'Could not fetch AI recommendations.',
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
          AI-Powered Health Insights
        </CardTitle>
        <CardDescription>Get personalized wellness recommendations based on your temperature data and lifestyle.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="userLifestyle" className="flex items-center mb-1">
              <Brain className="mr-2 h-4 w-4" />
              Describe your lifestyle & goals
            </Label>
            <Textarea
              id="userLifestyle"
              {...register('userLifestyle')}
              placeholder="e.g., I work a desk job, try to exercise 3 times a week, and want to improve my sleep quality..."
              rows={3}
            />
            {errors.userLifestyle && <p className="text-sm text-destructive mt-1">{errors.userLifestyle.message}</p>}
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? (
              <> <LoadingSpinner size={16} /> <span className="ml-2">Generating Insights...</span></>
            ) : 'Get AI Insights'}
          </Button>
        </form>

        {recommendations && (
          <div className="mt-6 p-4 border rounded-md bg-primary/5">
            <h4 className="font-semibold text-lg mb-2 text-primary">Your Personalized Recommendations:</h4>
            <p className="text-sm whitespace-pre-line">{recommendations}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
