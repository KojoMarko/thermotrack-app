'use client';

import type { TemperatureLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Legend } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

type TemperatureChartProps = {
  logs: TemperatureLog[];
  monthName: string;
  year: number;
};

const chartConfig = {
  morning: {
    label: "Morning Temp (°C)",
    color: "hsl(var(--chart-1))", // Uses primary color (Royal Blue)
  },
  evening: {
    label: "Evening Temp (°C)",
    color: "hsl(var(--chart-2))", // Uses a distinct color (Coral-Orange like)
  },
} satisfies import('@/components/ui/chart').ChartConfig;


export default function TemperatureChart({ logs, monthName, year }: TemperatureChartProps) {
  const chartData = logs.map(log => ({
    date: format(log.date.toDate(), 'dd'), // Day of the month
    fullDate: format(log.date.toDate(), 'MMM dd, yyyy'),
    morning: log.morningTemperature,
    evening: log.eveningTemperature,
  }));

  const hasData = logs.some(log => log.morningTemperature !== null || log.eveningTemperature !== null);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Temperature Trends - {monthName} {year}
        </CardTitle>
        <CardDescription>Visual representation of your morning and evening temperatures.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
                tickFormatter={(value) => value} // Displays day number
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                domain={['dataMin - 1', 'dataMax + 1']} 
                tickFormatter={(value) => `${value}°C`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                       if (payload && payload.length > 0) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                    indicator="line"
                    nameKey="name"
                  />
                }
              />
              <Line
                dataKey="morning"
                type="monotone"
                stroke={chartConfig.morning.color}
                strokeWidth={2}
                dot={{ r: 4, fill: chartConfig.morning.color }}
                activeDot={{ r: 6 }}
                name="Morning Temp (°C)"
              />
              <Line
                dataKey="evening"
                type="monotone"
                stroke={chartConfig.evening.color}
                strokeWidth={2}
                dot={{ r: 4, fill: chartConfig.evening.color }}
                activeDot={{ r: 6 }}
                name="Evening Temp (°C)"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No temperature data available to display chart for this period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
