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
import { CalendarIcon, ThermometerSun, ThermometerSnowflake, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

const temperatureSchema = z.object({
  date: z.date({ required_error: 'Date is required.' }),
  morningTemperature: z.preprocess(
    (val) => (val === "" ? null : parseFloat(String(val))),
    z.number().min(-50).max(50).nullable()
  ),
  eveningTemperature: z.preprocess(
    (val) => (val === "" ? null : parseFloat(String(val))),
    z.number().min(-50).max(50).nullable()
  ),
}).refine(data => data.morningTemperature !== null || data.eveningTemperature !== null, {
  message: "At least one temperature reading (morning or evening) is required.",
  path: ["morningTemperature"], // You can point to any field or a general one
});

type TemperatureFormData = z.infer<typeof temperatureSchema>;

type TemperatureFormProps = {
  onLogAdded: () => void; // Callback to refresh data on parent
};

export default function TemperatureForm({ onLogAdded }: TemperatureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const { control, handleSubmit, register, reset, formState: { errors } } = useForm<TemperatureFormData>({
    resolver: zodResolver(temperatureSchema),
    defaultValues: {
      date: new Date(),
      morningTemperature: null,
      eveningTemperature: null,
    },
  });

  const onSubmit = async (data: TemperatureFormData) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await addTemperatureLog(
        currentUser.uid,
        data.date,
        data.morningTemperature,
        data.eveningTemperature
      );
      toast({ title: 'Success', description: 'Temperature log added successfully.' });
      reset(); // Reset form to default values
      onLogAdded(); // Notify parent component
    } catch (error: any) {
      toast({
        title: 'Error Adding Log',
        description: error.message || 'Could not save temperature log.',
        variant: 'destructive',
      });
    } finally {
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
        <CardDescription>Enter your morning and/or evening temperature for a specific date.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
                        className="w-full justify-start text-left font-normal"
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

            <div className="space-y-2">
              <Label htmlFor="morningTemperature" className="flex items-center">
                <ThermometerSun className="mr-2 h-4 w-4 text-orange-500" />
                Morning Temp (°C)
              </Label>
              <Input
                id="morningTemperature"
                type="number"
                step="0.1"
                {...register('morningTemperature')}
                placeholder="e.g. 36.5"
              />
              {errors.morningTemperature && <p className="text-sm text-destructive">{errors.morningTemperature.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eveningTemperature" className="flex items-center">
                <ThermometerSnowflake className="mr-2 h-4 w-4 text-blue-500" />
                Evening Temp (°C)
              </Label>
              <Input
                id="eveningTemperature"
                type="number"
                step="0.1"
                {...register('eveningTemperature')}
                placeholder="e.g. 37.0"
              />
              {errors.eveningTemperature && <p className="text-sm text-destructive">{errors.eveningTemperature.message}</p>}
            </div>
          </div>
          {(errors as any)._errors?.length > 0 && (
             <p className="text-sm text-destructive">{(errors as any)._errors[0]}</p>
          )}

          <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Log'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
