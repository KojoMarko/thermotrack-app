
'use client';

import type { TemperatureLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { LineChart, CartesianGrid, XAxis, YAxis, Line } from 'recharts'; // Removed Legend import as ChartLegend is used
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
    color: "hsl(var(--chart-1))", 
  },
  evening: {
    label: "Evening Temp (°C)",
    color: "hsl(var(--chart-2))", 
  },
} satisfies import('@/components/ui/chart').ChartConfig;


export default function TemperatureChart({ logs, monthName, year }: TemperatureChartProps) {
  const chartData = logs.map(log => ({
    date: format(log.date.toDate(), 'dd'), 
    fullDate: format(log.date.toDate(), 'MMM dd, yyyy'),
    morning: log.morningTemperature,
    evening: log.eveningTemperature,
  }));

  const hasData = logs.some(log => log.morningTemperature !== null || log.eveningTemperature !== null);

  return (
    <Card className="shadow-lg border-none"> {/* Removed border for cleaner PDF capture if parent has one */}
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            Temperature Trends - {monthName} {year}
        </CardTitle>
        <CardDescription>Visual representation of your morning and evening temperatures.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[350px] sm:h-[400px] w-full"> {/* Increased height for landscape */}
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }} // Adjusted margins for landscape
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={true} horizontal={true} /> {/* More visible grid */}
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={{stroke: "#a0a0a0"}}
                tickMargin={8}
                tickFormatter={(value) => value} 
              />
              <YAxis 
                tickLine={false} 
                axisLine={{stroke: "#a0a0a0"}} 
                tickMargin={8} 
                domain={['dataMin - 2', 'dataMax + 2']} // Adjusted domain for better spacing
                tickFormatter={(value) => `${value}°C`}
              />
              <ChartTooltip
                cursor={true}
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
                strokeWidth={2.5}
                dot={{ r: 4, fill: chartConfig.morning.color }}
                activeDot={{ r: 7 }}
                name={chartConfig.morning.label}
              />
              <Line
                dataKey="evening"
                type="monotone"
                stroke={chartConfig.evening.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: chartConfig.evening.color }}
                activeDot={{ r: 7 }}
                name={chartConfig.evening.label}
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
