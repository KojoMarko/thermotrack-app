
'use client';

import React from 'react';
import type { DeletedTemperatureLog } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { ThermometerSun, ThermometerSnowflake, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

type DeletedTemperatureTableProps = {
  logs: DeletedTemperatureLog[];
  isLoading?: boolean;
};

const formatTempWithRange = (temp: number | null, minTemp: number | null, maxTemp: number | null) => {
  if (temp === null) return '-';
  let rangeString = '';
  if (minTemp !== null && maxTemp !== null) {
    rangeString = ` (Min: ${minTemp.toFixed(1)}, Max: ${maxTemp.toFixed(1)})`;
  } else if (minTemp !== null) {
    rangeString = ` (Min: ${minTemp.toFixed(1)})`;
  } else if (maxTemp !== null) {
    rangeString = ` (Max: ${maxTemp.toFixed(1)})`;
  }
  return `${temp.toFixed(1)}${rangeString}`;
};


export default function DeletedTemperatureTable({ logs, isLoading }: DeletedTemperatureTableProps) {
  if (isLoading) {
    return <p>Loading deleted logs...</p>;
  }

  return (
    <div className="rounded-lg border shadow-md overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Original Date</TableHead>
            <TableHead className="text-center">Morning (°C)</TableHead>
            <TableHead className="text-center">Evening (°C)</TableHead>
            <TableHead className="text-right w-[180px]">Deleted On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No deleted logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{format(log.date.toDate(), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-center">
                  <span className="flex items-center justify-center">
                    {log.morningTemperature !== null && <ThermometerSun className="h-4 w-4 mr-1 text-orange-400" />}
                    {formatTempWithRange(log.morningTemperature, log.morningMinTemperature, log.morningMaxTemperature)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="flex items-center justify-center">
                    {log.eveningTemperature !== null && <ThermometerSnowflake className="h-4 w-4 mr-1 text-blue-400" />}
                    {formatTempWithRange(log.eveningTemperature, log.eveningMinTemperature, log.eveningMaxTemperature)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="flex items-center justify-end">
                    <CalendarClock className="h-4 w-4 mr-1 text-muted-foreground" />
                    {log.deletedAt ? format(log.deletedAt.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
         {logs.length > 0 && <TableCaption>A list of your deleted temperature log entries.</TableCaption>}
      </Table>
    </div>
  );
}
