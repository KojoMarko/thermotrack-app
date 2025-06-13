
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import TemperatureForm from '@/components/thermo/TemperatureForm';
import TemperatureTable from '@/components/thermo/TemperatureTable';
import MonthlySummary from '@/components/thermo/MonthlySummary';
import TemperatureChart from '@/components/thermo/TemperatureChart';
import ReportButton from '@/components/thermo/ReportButton';
import AIInsights from '@/components/thermo/AIInsights';
import { getTemperatureLogsForMonth } from '@/lib/firestoreService';
import type { TemperatureLog, AggregatedDailyLog } from '@/lib/types'; // Import AggregatedDailyLog
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, getYear, getMonth, subMonths, addMonths, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: format(new Date(currentYear, i, 1), 'MMMM'),
}));

interface DailyAggregateData {
  date: string; // yyyy-MM-dd
  morning: { count: number; sumAvg: number; minTemp: number; maxTemp: number; actualMin: number | null; actualMax: number | null };
  evening: { count: number; sumAvg: number; minTemp: number; maxTemp: number; actualMin: number | null; actualMax: number | null };
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [rawLogs, setRawLogs] = useState<TemperatureLog[]>([]);
  const [aggregatedLogsForChart, setAggregatedLogsForChart] = useState<AggregatedDailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>((getMonth(new Date()) + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());

  const combinedChartRef = useRef<HTMLDivElement>(null);
  const morningPdfChartRef = useRef<HTMLDivElement>(null);
  const eveningPdfChartRef = useRef<HTMLDivElement>(null);

  const processLogsForDisplay = useCallback((logsToProcess: TemperatureLog[]): AggregatedDailyLog[] => {
    if (!logsToProcess || logsToProcess.length === 0) return [];

    const dailyAggregatesMap: Record<string, DailyAggregateData> = {};

    logsToProcess.forEach(log => {
      if (!log.timestamp || typeof log.timestamp.toDate !== 'function') {
        console.warn('[DashboardPage] processLogsForDisplay: Skipping log with invalid timestamp:', log);
        return;
      }
      const logDate = log.timestamp.toDate();
      const dayKey = format(logDate, 'yyyy-MM-dd');

      if (!dailyAggregatesMap[dayKey]) {
        dailyAggregatesMap[dayKey] = {
          date: dayKey,
          morning: { count: 0, sumAvg: 0, minTemp: Infinity, maxTemp: -Infinity, actualMin: null, actualMax: null },
          evening: { count: 0, sumAvg: 0, minTemp: Infinity, maxTemp: -Infinity, actualMin: null, actualMax: null },
        };
      }

      const targetPeriod = log.period === 'morning' ? dailyAggregatesMap[dayKey].morning : dailyAggregatesMap[dayKey].evening;

      if (log.period === 'morning' || log.period === 'evening') {
        if (log.averageTemperature !== null) {
          targetPeriod.sumAvg += log.averageTemperature;
          targetPeriod.count++;
        }
        if (log.minTemperature !== null) {
          targetPeriod.minTemp = Math.min(targetPeriod.minTemp, log.minTemperature);
          targetPeriod.actualMin = targetPeriod.actualMin === null ? log.minTemperature : Math.min(targetPeriod.actualMin, log.minTemperature);
        }
        if (log.maxTemperature !== null) {
          targetPeriod.maxTemp = Math.max(targetPeriod.maxTemp, log.maxTemperature);
          targetPeriod.actualMax = targetPeriod.actualMax === null ? log.maxTemperature : Math.max(targetPeriod.actualMax, log.maxTemperature);
        }
      }
    });

    const chartLogs: AggregatedDailyLog[] = Object.values(dailyAggregatesMap)
      .map(dayData => {
        const jsDate = parseISO(dayData.date);
         if (!isValid(jsDate)) {
          console.warn("Invalid date encountered in dailyAggregatesMap:", dayData.date);
          return null; 
        }
        return {
            date: jsDate,
            morningTemperature: dayData.morning.count > 0 ? parseFloat((dayData.morning.sumAvg / dayData.morning.count).toFixed(1)) : null,
            morningMinTemperature: dayData.morning.actualMin === Infinity || dayData.morning.actualMin === -Infinity ? null : dayData.morning.actualMin,
            morningMaxTemperature: dayData.morning.actualMax === Infinity || dayData.morning.actualMax === -Infinity ? null : dayData.morning.actualMax,
            eveningTemperature: dayData.evening.count > 0 ? parseFloat((dayData.evening.sumAvg / dayData.evening.count).toFixed(1)) : null,
            eveningMinTemperature: dayData.evening.actualMin === Infinity || dayData.evening.actualMin === -Infinity ? null : dayData.evening.actualMin,
            eveningMaxTemperature: dayData.evening.actualMax === Infinity || dayData.evening.actualMax === -Infinity ? null : dayData.evening.actualMax,
        };
      })
      .filter(log => log !== null) as AggregatedDailyLog[];
      
    return chartLogs.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, []);


  const fetchLogs = useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const yearNum = parseInt(selectedYear, 10);
        const monthNum = parseInt(selectedMonth, 10);
        const fetchedLogs = await getTemperatureLogsForMonth(currentUser.uid, yearNum, monthNum);
        setRawLogs(fetchedLogs);
        const processedForChart = processLogsForDisplay(fetchedLogs);
        setAggregatedLogsForChart(processedForChart);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, selectedMonth, selectedYear, processLogsForDisplay]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDateChange = (increment: number) => {
    const currentDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) -1);
    const newDate = addMonths(currentDate, increment);
    setSelectedYear(getYear(newDate).toString());
    setSelectedMonth((getMonth(newDate) + 1).toString());
  };

  const selectedMonthName = months.find(m => m.value === selectedMonth)?.label || '';

  const chartConfigsForPdf = [
    { chartRef: morningPdfChartRef, title: `Morning Temperature Trends - ${selectedMonthName} ${selectedYear}` },
    { chartRef: eveningPdfChartRef, title: `Evening Temperature Trends - ${selectedMonthName} ${selectedYear}` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-headline font-semibold mb-2">Refrigerator Temperature Dashboard</h2>
        <p className="text-muted-foreground">Track, analyze, and gain insights from your daily fridge temperature readings.</p>
      </div>

      <TemperatureForm onLogAdded={fetchLogs} />

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-xl font-semibold font-headline">Monthly Overview</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Button variant="outline" size="icon" onClick={() => handleDateChange(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64"><LoadingSpinner size={32}/></div>
          ) : (
            <div className="space-y-6 bg-background p-0 sm:p-4 rounded-md">
              <MonthlySummary logs={aggregatedLogsForChart} />
              <div ref={combinedChartRef} className="bg-card p-2 rounded-md">
                <TemperatureChart logs={aggregatedLogsForChart} monthName={selectedMonthName} year={parseInt(selectedYear)} displayMode="combined" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1000px', height: '600px', backgroundColor: 'white' }} ref={morningPdfChartRef}>
          <TemperatureChart logs={aggregatedLogsForChart} monthName={selectedMonthName} year={parseInt(selectedYear)} displayMode="morningDetails" chartTitle={`Morning Temperature Detail - ${selectedMonthName} ${selectedYear}`}/>
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1000px', height: '600px', backgroundColor: 'white' }} ref={eveningPdfChartRef}>
          <TemperatureChart logs={aggregatedLogsForChart} monthName={selectedMonthName} year={parseInt(selectedYear)} displayMode="eveningDetails" chartTitle={`Evening Temperature Detail - ${selectedMonthName} ${selectedYear}`}/>
      </div>

      {!isLoading && rawLogs.length > 0 && (
        <div className="mt-6 flex justify-end">
         <ReportButton
            chartsToPrint={chartConfigsForPdf}
            reportFileName={`ThermoTrack_Report_${selectedMonthName}_${selectedYear}.pdf`}
          />
        </div>
      )}

      <TemperatureTable logs={rawLogs} onLogDeleted={fetchLogs} isLoading={isLoading} />

      <AIInsights
        monthlyLogs={rawLogs}
        monthName={selectedMonthName}
        year={parseInt(selectedYear, 10)}
      />

    </div>
  );
}
