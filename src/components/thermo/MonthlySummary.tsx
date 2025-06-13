
'use client';

import type { AggregatedDailyLog } from '@/lib/types'; // Use AggregatedDailyLog
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Thermometer, ArrowDown, ArrowUp, Sigma } from 'lucide-react';

type MonthlySummaryProps = {
  logs: AggregatedDailyLog[]; // Expecting aggregated daily logs
};

interface TempStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number; // Number of days with readings for this period
}

const calculateOverallStats = (dailyLogs: AggregatedDailyLog[], period: 'morning' | 'evening'): TempStats => {
  const validAvgTemps: number[] = [];
  const validMinTemps: number[] = [];
  const validMaxTemps: number[] = [];
  let daysWithReadings = 0;

  dailyLogs.forEach(log => {
    const avgTemp = period === 'morning' ? log.morningTemperature : log.eveningTemperature;
    const minTemp = period === 'morning' ? log.morningMinTemperature : log.eveningMinTemperature;
    const maxTemp = period === 'morning' ? log.morningMaxTemperature : log.eveningMaxTemperature;
    
    let hasReadingForPeriod = false;
    if (avgTemp !== null) {
      validAvgTemps.push(avgTemp);
      hasReadingForPeriod = true;
    }
    if (minTemp !== null) {
      validMinTemps.push(minTemp);
      hasReadingForPeriod = true;
    }
    if (maxTemp !== null) {
      validMaxTemps.push(maxTemp);
      hasReadingForPeriod = true;
    }
    if (hasReadingForPeriod) {
        daysWithReadings++;
    }
  });

  if (daysWithReadings === 0) {
    return { avg: null, min: null, max: null, count: 0 };
  }

  const sumAvg = validAvgTemps.reduce((acc, temp) => acc + temp, 0);
  
  return {
    avg: validAvgTemps.length > 0 ? parseFloat((sumAvg / validAvgTemps.length).toFixed(1)) : null,
    min: validMinTemps.length > 0 ? Math.min(...validMinTemps) : null,
    max: validMaxTemps.length > 0 ? Math.max(...validMaxTemps) : null,
    count: daysWithReadings,
  };
};

export default function MonthlySummary({ logs }: MonthlySummaryProps) {
  const morningStats = calculateOverallStats(logs, 'morning');
  const eveningStats = calculateOverallStats(logs, 'evening');

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
        <CardDescription>Overall average, minimum, and maximum temperatures for the selected month based on daily aggregated readings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
            <Thermometer className="mr-2 h-5 w-5 text-orange-500" />
            Morning Temperatures ({morningStats.count} days with readings)
          </h3>
          {morningStats.count > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Overall Avg" value={morningStats.avg} icon={<Sigma size={20}/>} />
              <StatCard title="Overall Min" value={morningStats.min} icon={<ArrowDown size={20}/>} />
              <StatCard title="Overall Max" value={morningStats.max} icon={<ArrowUp size={20}/>} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No morning temperature data for this period.</p>
          )}
        </div>
        
        <hr className="my-4 border-border" />

        <div>
           <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
            <Thermometer className="mr-2 h-5 w-5 text-blue-500" />
            Evening Temperatures ({eveningStats.count} days with readings)
          </h3>
          {eveningStats.count > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <StatCard title="Overall Avg" value={eveningStats.avg} icon={<Sigma size={20}/>} />
              <StatCard title="Overall Min" value={eveningStats.min} icon={<ArrowDown size={20}/>} />
              <StatCard title="Overall Max" value={eveningStats.max} icon={<ArrowUp size={20}/>} />
            </div>
           ) : (
            <p className="text-sm text-muted-foreground">No evening temperature data for this period.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
