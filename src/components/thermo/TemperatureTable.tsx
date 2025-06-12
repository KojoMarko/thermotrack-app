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
  // onEditLog: (log: TemperatureLog) => void; // Future functionality
  isLoading?: boolean;
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
                  {log.morningTemperature !== null ? (
                    <span className="flex items-center justify-center">
                      <ThermometerSun className="h-4 w-4 mr-1 text-orange-400" />
                      {log.morningTemperature.toFixed(1)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {log.eveningTemperature !== null ? (
                     <span className="flex items-center justify-center">
                      <ThermometerSnowflake className="h-4 w-4 mr-1 text-blue-400" />
                      {log.eveningTemperature.toFixed(1)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {/* <Button variant="ghost" size="icon" onClick={() => onEditLog(log)} className="text-primary hover:text-primary/80">
                    <Edit3 size={18} />
                  </Button> */}
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
