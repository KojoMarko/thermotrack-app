'use client';

import type { TemperatureLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Thermometer, ArrowDown, ArrowUp, Sigma } from 'lucide-react';

type MonthlySummaryProps = {
  logs: TemperatureLog[];
};

interface TempStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

const calculateStats = (temperatures: (number | null)[]): TempStats => {
  const validTemps = temperatures.filter(temp => temp !== null) as number[];
  if (validTemps.length === 0) {
    return { avg: null, min: null, max: null, count: 0 };
  }
  const sum = validTemps.reduce((acc, temp) => acc + temp, 0);
  return {
    avg: parseFloat((sum / validTemps.length).toFixed(1)),
    min: Math.min(...validTemps),
    max: Math.max(...validTemps),
    count: validTemps.length,
  };
};

export default function MonthlySummary({ logs }: MonthlySummaryProps) {
  const morningTemps = logs.map(log => log.morningTemperature);
  const eveningTemps = logs.map(log => log.eveningTemperature);

  const morningStats = calculateStats(morningTemps);
  const eveningStats = calculateStats(eveningTemps);

  const StatCard = ({ title, value, icon, unit = "°C" }: { title: string, value: number | string | null, icon: React.ReactNode, unit?: string }) => (
    <div className="flex flex-col p-4 bg-muted/30 rounded-lg items-center text-center">
      <div className="text-primary mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold text-foreground">
        {value !== null ? `${value}${unit}` : '-'}
      </p>
    </div>
  );


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Monthly Temperature Summary
        </CardTitle>
        <CardDescription>Average, minimum, and maximum temperatures for the selected month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
            <Thermometer className="mr-2 h-5 w-5 text-orange-500" />
            Morning Temperatures ({morningStats.count} readings)
          </h3>
          {morningStats.count > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Average" value={morningStats.avg} icon={<Sigma size={20}/>} />
              <StatCard title="Min" value={morningStats.min} icon={<ArrowDown size={20}/>} />
              <StatCard title="Max" value={morningStats.max} icon={<ArrowUp size={20}/>} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No morning temperature data for this period.</p>
          )}
        </div>
        
        <hr className="my-4 border-border" />

        <div>
           <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
            <Thermometer className="mr-2 h-5 w-5 text-blue-500" />
            Evening Temperatures ({eveningStats.count} readings)
          </h3>
          {eveningStats.count > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <StatCard title="Average" value={eveningStats.avg} icon={<Sigma size={20}/>} />
              <StatCard title="Min" value={eveningStats.min} icon={<ArrowDown size={20}/>} />
              <StatCard title="Max" value={eveningStats.max} icon={<ArrowUp size={20}/>} />
            </div>
           ) : (
            <p className="text-sm text-muted-foreground">No evening temperature data for this period.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
