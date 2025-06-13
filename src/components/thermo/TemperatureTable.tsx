
'use client';

import React from 'react';
import type { TemperatureLog } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, User, Thermometer, CalendarDays } from 'lucide-react';
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
            <TableHead className="w-[150px]"><CalendarDays className="inline-block mr-1 h-4 w-4"/>Date</TableHead>
            <TableHead className="text-center"><Thermometer className="inline-block mr-1 h-4 w-4 text-orange-500"/>Morning (°C)</TableHead>
            <TableHead className="text-center"><Thermometer className="inline-block mr-1 h-4 w-4 text-blue-500"/>Evening (°C)</TableHead>
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
                <TableCell className="font-medium">{format(log.date.toDate(), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-center">
                  {formatTempWithRange(log.morningTemperature, log.morningMinTemperature, log.morningMaxTemperature)}
                </TableCell>
                <TableCell className="text-center">
                  {formatTempWithRange(log.eveningTemperature, log.eveningMinTemperature, log.eveningMaxTemperature)}
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
