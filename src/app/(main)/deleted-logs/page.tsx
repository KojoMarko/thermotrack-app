'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import DeletedTemperatureTable from '@/components/thermo/DeletedTemperatureTable';
import { getDeletedTemperatureLogs } from '@/lib/firestoreService';
import type { DeletedTemperatureLog } from '@/lib/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArchiveX } from 'lucide-react';

export default function DeletedLogsPage() {
  const { currentUser } = useAuth();
  const [deletedLogs, setDeletedLogs] = useState<DeletedTemperatureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeletedLogs = useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const fetchedLogs = await getDeletedTemperatureLogs(currentUser.uid);
        setDeletedLogs(fetchedLogs);
      } catch (error) {
        console.error("Error fetching deleted logs:", error);
        // Add toast notification for error
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDeletedLogs();
  }, [fetchDeletedLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <ArchiveX className="h-8 w-8 text-primary" />
        <div>
            <h2 className="text-3xl font-headline font-semibold">Deleted Data Log</h2>
            <p className="text-muted-foreground">This page shows temperature entries that have been deleted. This log is for auditing purposes.</p>
        </div>
      </div>
      
      {isLoading ? (
         <div className="flex justify-center items-center h-64"><LoadingSpinner size={32}/></div>
      ) : (
        <DeletedTemperatureTable logs={deletedLogs} />
      )}
    </div>
  );
}
