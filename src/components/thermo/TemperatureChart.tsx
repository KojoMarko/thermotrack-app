
'use client';

import type { AggregatedDailyLog } from '@/lib/types'; // Import the new type
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Label } from 'recharts';
import { format, isValid } from 'date-fns';
import { TrendingUp } from 'lucide-react';

type ChartDataType = {
  date: string; // Formatted day of month 'dd'
  fullDate: string; // Formatted full date 'MMM dd, yyyy'
  morningAvg: number | null;
  morningMin: number | null;
  morningMax: number | null;
  eveningAvg: number | null;
  eveningMin: number | null;
  eveningMax: number | null;
};

type TemperatureChartProps = {
  logs: AggregatedDailyLog[]; // Use AggregatedDailyLog[] for the logs prop
  monthName: string;
  year: number;
  displayMode?: 'combined' | 'morningDetails' | 'eveningDetails';
  chartTitle?: string;
};

const chartConfigBase = {
  morningAvg: {
    label: "Morning Avg (°C)",
    color: "hsl(var(--chart-1))",
  },
  morningMin: {
    label: "Morning Min (°C)",
    color: "hsl(var(--chart-1))", // Can use a lighter shade or different style
    strokeDasharray: "3 3",
  },
  morningMax: {
    label: "Morning Max (°C)",
    color: "hsl(var(--chart-1))", // Can use a lighter shade or different style
    strokeDasharray: "3 3",
  },
  eveningAvg: {
    label: "Evening Avg (°C)",
    color: "hsl(var(--chart-2))",
  },
  eveningMin: {
    label: "Evening Min (°C)",
    color: "hsl(var(--chart-2))", // Can use a lighter shade or different style
    strokeDasharray: "3 3",
  },
  eveningMax: {
    label: "Evening Max (°C)",
    color: "hsl(var(--chart-2))", // Can use a lighter shade or different style
    strokeDasharray: "3 3",
  },
} satisfies import('@/components/ui/chart').ChartConfig;


export default function TemperatureChart({
  logs,
  monthName,
  year,
  displayMode = 'combined',
  chartTitle
}: TemperatureChartProps) {
  const chartData: ChartDataType[] = logs.map(log => {
    // log.date is now a JavaScript Date object from AggregatedDailyLog
    if (!log.date || !(log.date instanceof Date) || !isValid(log.date)) {
      console.warn("Invalid date object in logs for chart:", log);
      return { // Provide a default structure to avoid crashes
        date: 'N/A',
        fullDate: 'Invalid Date',
        morningAvg: null, morningMin: null, morningMax: null,
        eveningAvg: null, eveningMin: null, eveningMax: null,
      };
    }
    return {
      date: format(log.date, 'dd'), // No .toDate() needed
      fullDate: format(log.date, 'MMM dd, yyyy'), // No .toDate() needed
      morningAvg: log.morningTemperature,
      morningMin: log.morningMinTemperature,
      morningMax: log.morningMaxTemperature,
      eveningAvg: log.eveningTemperature,
      eveningMin: log.eveningMinTemperature,
      eveningMax: log.eveningMaxTemperature,
    };
  });

  const currentChartConfig: import('@/components/ui/chart').ChartConfig = {};
  if (displayMode === 'combined') {
    currentChartConfig.morningAvg = chartConfigBase.morningAvg;
    currentChartConfig.eveningAvg = chartConfigBase.eveningAvg;
  } else if (displayMode === 'morningDetails') {
    currentChartConfig.morningAvg = chartConfigBase.morningAvg;
    currentChartConfig.morningMin = chartConfigBase.morningMin;
    currentChartConfig.morningMax = chartConfigBase.morningMax;
  } else if (displayMode === 'eveningDetails') {
    currentChartConfig.eveningAvg = chartConfigBase.eveningAvg;
    currentChartConfig.eveningMin = chartConfigBase.eveningMin;
    currentChartConfig.eveningMax = chartConfigBase.eveningMax;
  }

  const hasData = chartData.some(d => 
    (displayMode === 'combined' && (d.morningAvg !== null || d.eveningAvg !== null)) ||
    (displayMode === 'morningDetails' && (d.morningAvg !== null || d.morningMin !== null || d.morningMax !== null)) ||
    (displayMode === 'eveningDetails' && (d.eveningAvg !== null || d.eveningMin !== null || d.eveningMax !== null))
  );

  const title = chartTitle || `Temperature Trends - ${monthName} ${year}${displayMode !== 'combined' ? (displayMode === 'morningDetails' ? ' (Morning)' : ' (Evening)') : ''}`;

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            <TrendingUp className="mr-2 h-6 w-6 text-primary" />
            {title}
        </CardTitle>
        <CardDescription>
          {displayMode === 'combined' && "Visual representation of your average morning and evening temperatures."}
          {displayMode === 'morningDetails' && "Detailed morning temperature trends (Average, Min, Max)."}
          {displayMode === 'eveningDetails' && "Detailed evening temperature trends (Average, Min, Max)."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={currentChartConfig} className="h-[350px] sm:h-[400px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#cccccc" vertical={true} horizontal={true} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{stroke: "#a0a0a0"}}
                tickMargin={8}
                tickFormatter={(value) => value}
              >
                <Label value="Day of Month" offset={0} position="insideBottom" dy={10} style={{ textAnchor: 'middle', fill: 'hsl(var(--foreground))' }} />
              </XAxis>
              <YAxis
                tickLine={false}
                axisLine={{stroke: "#a0a0a0"}}
                tickMargin={8}
                domain={['dataMin - 2', 'dataMax + 2']}
                tickFormatter={(value) => `${value}°C`}
              >
                <Label value="Temperature (°C)" angle={-90} position="insideLeft" dx={-10} style={{ textAnchor: 'middle', fill: 'hsl(var(--foreground))' }} />
              </YAxis>
              <ChartTooltip
                cursor={true}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                       if (payload && payload.length > 0 && payload[0].payload.fullDate) {
                        return payload[0].payload.fullDate;
                      }
                      return label;
                    }}
                    indicator="line"
                    nameKey="name"
                  />
                }
              />
              {displayMode === 'combined' && (
                <>
                  <Line dataKey="morningAvg" type="monotone" stroke={chartConfigBase.morningAvg.color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfigBase.morningAvg.color }} activeDot={{ r: 7 }} name={chartConfigBase.morningAvg.label} connectNulls={true} />
                  <Line dataKey="eveningAvg" type="monotone" stroke={chartConfigBase.eveningAvg.color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfigBase.eveningAvg.color }} activeDot={{ r: 7 }} name={chartConfigBase.eveningAvg.label} connectNulls={true} />
                </>
              )}
              {displayMode === 'morningDetails' && (
                <>
                  <Line dataKey="morningAvg" type="monotone" stroke={chartConfigBase.morningAvg.color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfigBase.morningAvg.color }} activeDot={{ r: 7 }} name={chartConfigBase.morningAvg.label} connectNulls={true}/>
                  <Line dataKey="morningMin" type="monotone" stroke={chartConfigBase.morningMin.color} strokeWidth={1.5} strokeDasharray={chartConfigBase.morningMin.strokeDasharray} dot={false} activeDot={{ r: 5 }} name={chartConfigBase.morningMin.label} connectNulls={true}/>
                  <Line dataKey="morningMax" type="monotone" stroke={chartConfigBase.morningMax.color} strokeWidth={1.5} strokeDasharray={chartConfigBase.morningMax.strokeDasharray} dot={false} activeDot={{ r: 5 }} name={chartConfigBase.morningMax.label} connectNulls={true}/>
                </>
              )}
              {displayMode === 'eveningDetails' && (
                <>
                  <Line dataKey="eveningAvg" type="monotone" stroke={chartConfigBase.eveningAvg.color} strokeWidth={2.5} dot={{ r: 4, fill: chartConfigBase.eveningAvg.color }} activeDot={{ r: 7 }} name={chartConfigBase.eveningAvg.label} connectNulls={true}/>
                  <Line dataKey="eveningMin" type="monotone" stroke={chartConfigBase.eveningMin.color} strokeWidth={1.5} strokeDasharray={chartConfigBase.eveningMin.strokeDasharray} dot={false} activeDot={{ r: 5 }} name={chartConfigBase.eveningMin.label} connectNulls={true}/>
                  <Line dataKey="eveningMax" type="monotone" stroke={chartConfigBase.eveningMax.color} strokeWidth={1.5} strokeDasharray={chartConfigBase.eveningMax.strokeDasharray} dot={false} activeDot={{ r: 5 }} name={chartConfigBase.eveningMax.label} connectNulls={true}/>
                </>
              )}
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
