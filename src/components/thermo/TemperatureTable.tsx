
'use client';

import React from 'react';
import type { TemperatureLog } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, User, Thermometer, CalendarDays, Clock } from 'lucide-react';
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
  onLogDeleted: () => void;
  isLoading?: boolean;
};

const formatTempWithRange = (temp: number | null, minTemp: number | null, maxTemp: number | null) => {
  if (temp === null && minTemp === null && maxTemp === null) return '-';
  
  let displayTemp = temp !== null ? `${temp.toFixed(1)}°C` : '';
  
  let rangeString = '';
  if (minTemp !== null && maxTemp !== null) {
    rangeString = ` (Min: ${minTemp.toFixed(1)}, Max: ${maxTemp.toFixed(1)})`;
  } else if (minTemp !== null) {
    rangeString = ` (Min: ${minTemp.toFixed(1)})`;
  } else if (maxTemp !== null) {
    rangeString = ` (Max: ${maxTemp.toFixed(1)})`;
  }
  
  if (displayTemp && rangeString) {
    return `${displayTemp}${rangeString}`;
  } else if (displayTemp) {
    return displayTemp;
  } else if (rangeString) {
    // If only min/max are available, display that.
    // Remove leading space if displayTemp is empty.
    return rangeString.trimStart();
  }
  return '-'; // Fallback if all are null (though covered by first check)
};

export default function TemperatureTable({ logs, onLogDeleted, isLoading }: TemperatureTableProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleDelete = async (logId: string) => {
    if (!currentUser) {
      toast({ title: 'Error', description: 'You must be logged in to delete logs.', variant: 'destructive' });
      return;
    }
    try {
      await deleteTemperatureLog(currentUser.uid, logId, currentUser.uid, currentUser.displayName || null);
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
            <TableHead className="w-[180px]"><CalendarDays className="inline-block mr-1 h-4 w-4"/>Date & Time</TableHead>
            <TableHead className="text-center"><Clock className="inline-block mr-1 h-4 w-4"/>Period</TableHead>
            <TableHead className="text-center"><Thermometer className="inline-block mr-1 h-4 w-4"/>Reading (°C)</TableHead>
            <TableHead><User className="inline-block mr-1 h-4 w-4"/>Added By</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No temperature logs found for this period.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </TableCell>
                <TableCell className="text-center capitalize">{log.period}</TableCell>
                <TableCell className="text-center">
                  {formatTempWithRange(log.averageTemperature, log.minTemperature, log.maxTemperature)}
                </TableCell>
                <TableCell>{log.addedByUserName || log.addedByUserId}</TableCell>
                <TableCell className="text-right space-x-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" aria-label="Delete log">
                        <Trash2 size={18} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will move the log entry to the Deleted Logs. It can be viewed there but not restored directly from the UI. This action is permanent.
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
