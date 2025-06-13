
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
import type { TemperatureLog } from '@/lib/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, getYear, getMonth, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const currentYear = getYear(new Date());
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i); 
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(), 
  label: format(new Date(currentYear, i, 1), 'MMMM'),
}));


export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>((getMonth(new Date()) + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(getYear(new Date()).toString());
  
  const chartReportRef = useRef<HTMLDivElement>(null); // Ref specifically for the chart

  const fetchLogs = useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const yearNum = parseInt(selectedYear, 10);
        const monthNum = parseInt(selectedMonth, 10);
        const fetchedLogs = await getTemperatureLogsForMonth(currentUser.uid, yearNum, monthNum);
        setLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, selectedMonth, selectedYear]);

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
              <MonthlySummary logs={logs} />
              <div ref={chartReportRef} className="bg-card p-2 rounded-md"> {/* Ref for chart PDF capture */}
                <TemperatureChart logs={logs} monthName={selectedMonthName} year={parseInt(selectedYear)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {!isLoading && logs.length > 0 && (
        <div className="mt-6 flex justify-end">
         <ReportButton 
            reportContentRef={chartReportRef} 
            reportFileName={`ThermoTrack_Chart_${selectedMonthName}_${selectedYear}.pdf`}
            reportTitle={`Temperature Trend Chart - ${selectedMonthName} ${selectedYear}`}
          />
        </div>
      )}

      <TemperatureTable logs={logs} onLogDeleted={fetchLogs} isLoading={isLoading} />
      
      <AIInsights 
        monthlyLogs={logs} 
        monthName={selectedMonthName} 
        year={parseInt(selectedYear, 10)} 
      />

    </div>
  );
}
