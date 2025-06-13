
'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { addTemperatureLog } from '@/lib/firestoreService';
import { CalendarIcon, Thermometer, PlusCircle, User } from 'lucide-react';
import { format } from 'date-fns';

const temperatureSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  morningMinTemperature: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(parseFloat(String(val))) ? null : parseFloat(String(val))),
    z.number().min(-50).max(100).nullable()
  ),
  morningMaxTemperature: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(parseFloat(String(val))) ? null : parseFloat(String(val))),
    z.number().min(-50).max(100).nullable()
  ),
  eveningMinTemperature: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(parseFloat(String(val))) ? null : parseFloat(String(val))),
    z.number().min(-50).max(100).nullable()
  ),
  eveningMaxTemperature: z.preprocess(
    (val) => (val === "" || val === undefined || Number.isNaN(parseFloat(String(val))) ? null : parseFloat(String(val))),
    z.number().min(-50).max(100).nullable()
  ),
})
.refine(data => (data.morningMinTemperature !== null && data.morningMaxTemperature !== null) ? data.morningMinTemperature <= data.morningMaxTemperature : true, {
  message: "Morning Min temperature must be less than or equal to Morning Max temperature if both are provided.",
  path: ["morningMinTemperature"],
})
.refine(data => (data.eveningMinTemperature !== null && data.eveningMaxTemperature !== null) ? data.eveningMinTemperature <= data.eveningMaxTemperature : true, {
  message: "Evening Min temperature must be less than or equal to Evening Max temperature if both are provided.",
  path: ["eveningMinTemperature"],
})
.refine(data => {
  return data.morningMinTemperature !== null ||
         data.morningMaxTemperature !== null ||
         data.eveningMinTemperature !== null ||
         data.eveningMaxTemperature !== null;
}, {
  message: "At least one temperature reading (min or max, for morning or evening) is required.",
  path: ["morningMinTemperature"],
});

type TemperatureFormData = z.infer<typeof temperatureSchema>;

type TemperatureFormProps = {
  onLogAdded: () => void;
};

export default function TemperatureForm({ onLogAdded }: TemperatureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const { control, handleSubmit, register, reset, formState: { errors } } = useForm<TemperatureFormData>({
    resolver: zodResolver(temperatureSchema),
    defaultValues: {
      date: new Date(),
      morningMinTemperature: null,
      morningMaxTemperature: null,
      eveningMinTemperature: null,
      eveningMaxTemperature: null,
    },
  });

  const calculateAverageOrSingle = (min: number | null, max: number | null): number | null => {
    if (min !== null && max !== null) {
      return parseFloat(((min + max) / 2).toFixed(1));
    }
    if (min !== null) {
      return parseFloat(min.toFixed(1));
    }
    if (max !== null) {
      return parseFloat(max.toFixed(1));
    }
    return null;
  };

  const onSubmit = async (data: TemperatureFormData) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in to add a log.', variant: 'destructive' });
      return;
    }
    console.log("[TemperatureForm] Attempting to add log with data:", data);
    setIsLoading(true);

    const calculatedMorningTemp = calculateAverageOrSingle(data.morningMinTemperature, data.morningMaxTemperature);
    const calculatedEveningTemp = calculateAverageOrSingle(data.eveningMinTemperature, data.eveningMaxTemperature);

    try {
      await addTemperatureLog(
        currentUser.uid, // ownerUserId is the current user for their own logs
        data.date,
        calculatedMorningTemp,
        data.morningMinTemperature,
        data.morningMaxTemperature,
        calculatedEveningTemp,
        data.eveningMinTemperature,
        data.eveningMaxTemperature,
        currentUser.uid, // addedByUserId
        currentUser.displayName || null // addedByUserName
      );
      toast({ title: 'Success!', description: 'Temperature log added successfully.' });
      reset({ date: new Date(), morningMinTemperature: null, morningMaxTemperature: null, eveningMinTemperature: null, eveningMaxTemperature: null });
      onLogAdded();
    } catch (error: any) {
      console.error("[TemperatureForm] Error during form submission:", error);
      toast({
        title: 'Error Adding Log',
        description: error.message || 'Could not save temperature log. Please try again.',
        variant: 'destructive',
      });
    } finally {
      console.log("[TemperatureForm] onSubmit finally block reached. Setting isLoading to false.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <PlusCircle className="mr-2 h-6 w-6 text-primary" />
          Add New Temperature Log
        </CardTitle>
        <CardDescription>Enter your fridge's min/max temperature readings. The average will be calculated for display. At least one reading is required. Log will be associated with the currently logged-in user: <span className="font-medium text-primary">{currentUser?.displayName || currentUser?.email}</span>.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full md:w-1/3 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-4">
            <p className="font-medium text-foreground flex items-center"><Thermometer className="mr-2 h-5 w-5 text-orange-500" /> Morning Min/Max Readings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="morningMinTemperature">Min Temp (°C)</Label>
                <Input
                  id="morningMinTemperature"
                  type="number"
                  step="0.1"
                  {...register('morningMinTemperature')}
                  placeholder="e.g. 2.0"
                />
                {(errors.morningMinTemperature && errors.morningMinTemperature?.message && !errors.morningMinTemperature.message.includes("At least one")) && <p className="text-xs text-destructive mt-1">{errors.morningMinTemperature?.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="morningMaxTemperature">Max Temp (°C)</Label>
                <Input
                  id="morningMaxTemperature"
                  type="number"
                  step="0.1"
                  {...register('morningMaxTemperature')}
                  placeholder="e.g. 8.0"
                />
                {errors.morningMaxTemperature && <p className="text-xs text-destructive mt-1">{errors.morningMaxTemperature.message}</p>}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="font-medium text-foreground flex items-center"><Thermometer className="mr-2 h-5 w-5 text-blue-500" /> Evening Min/Max Readings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                <Label htmlFor="eveningMinTemperature">Min Temp (°C)</Label>
                <Input
                  id="eveningMinTemperature"
                  type="number"
                  step="0.1"
                  {...register('eveningMinTemperature')}
                  placeholder="e.g. 2.5"
                />
                {errors.eveningMinTemperature && <p className="text-xs text-destructive mt-1">{errors.eveningMinTemperature.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="eveningMaxTemperature">Max Temp (°C)</Label>
                <Input
                  id="eveningMaxTemperature"
                  type="number"
                  step="0.1"
                  {...register('eveningMaxTemperature')}
                  placeholder="e.g. 7.5"
                />
                 {errors.eveningMaxTemperature && <p className="text-xs text-destructive mt-1">{errors.eveningMaxTemperature.message}</p>}
              </div>
            </div>
          </div>

          {errors.morningMinTemperature && (errors.morningMinTemperature.message?.includes("At least one temperature reading") || errors.morningMinTemperature.message?.includes("Morning Min temperature must be less than")) && (
             <p className="text-sm text-destructive mt-2">{errors.morningMinTemperature.message}</p>
          )}
           {errors.eveningMinTemperature && errors.eveningMinTemperature.message?.includes("Evening Min temperature must be less than") && (
             <p className="text-sm text-destructive mt-2">{errors.eveningMinTemperature.message}</p>
          )}


          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Log'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
