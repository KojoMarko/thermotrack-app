
'use client';

import React from 'react';
import type { TemperatureLog } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit3, ThermometerSun, ThermometerSnowflake } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { deleteTemperatureLog } from '@/lib/firestoreService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type TemperatureTableProps = {
  logs: TemperatureLog[];
  onLogDeleted: () => void; // Callback to refresh data
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

export default function TemperatureTable({ logs, onLogDeleted, isLoading }: TemperatureTableProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleDelete = async (logId: string) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }
    try {
      await deleteTemperatureLog(currentUser.uid, logId);
      toast({ title: 'Success', description: 'Log entry moved to deleted logs.' });
      onLogDeleted();
    } catch (error: any) {
      toast({ title: 'Error Deleting Log', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <p>Loading temperature logs...</p>;
  }

  return (
    <div className="rounded-lg border shadow-md overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Date</TableHead>
            <TableHead className="text-center">Morning (°C)</TableHead>
            <TableHead className="text-center">Evening (°C)</TableHead>
            <TableHead className="text-right w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No temperature logs found for this period.
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
                <TableCell className="text-right space-x-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                        <Trash2 size={18} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will move the log entry to the Deleted Logs. It can be viewed there but not restored directly from the UI.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(log.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {logs.length > 0 && <TableCaption>A list of your recent temperature logs for the selected period.</TableCaption>}
      </Table>
    </div>
  );
}
