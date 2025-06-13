
import { db } from '@/lib/firebase';
import type { TemperatureLog, DeletedTemperatureLog } from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch,
  serverTimestamp,
  getDoc,
  limit,
  type FieldValue,
} from 'firebase/firestore';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, getHours } from 'date-fns';

const getTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/temperatures`);
const getDeletedTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/deletedTemperatures`);

// Helper function to determine if the time is morning, evening, or other
const getPeriodForTimestamp = (timestamp: Date): 'morning' | 'evening' | 'other' => {
  const hour = getHours(timestamp);
  if (hour >= 5 && hour < 12) { // 5:00 AM to 11:59 AM
    return 'morning';
  } else if (hour >= 17 && hour < 22) { // 5:00 PM (17:00) to 9:59 PM (21:59)
    return 'evening';
  }
  return 'other';
};

export const addTemperatureLog = async (
  ownerUserId: string,
  timestamp: Date, // This is now the actual reading time
  minTemperature: number | null,
  maxTemperature: number | null,
  averageTemperature: number | null,
  addedByUserId: string,
  addedByUserName: string | null
): Promise<string> => {
  if (!ownerUserId || !addedByUserId || !timestamp) {
    console.error("[firestoreService] addTemperatureLog called with missing required fields.");
    throw new Error("User ID, timestamp, and adding user ID are required.");
  }
  console.log("[firestoreService] addTemperatureLog data received:", {
    ownerUserId, timestamp, minTemperature, maxTemperature, averageTemperature, addedByUserId, addedByUserName
  });

  const period = getPeriodForTimestamp(timestamp);

  try {
    console.log(`[firestoreService] Adding new log for owner user ${ownerUserId} (added by ${addedByUserId}) for timestamp ${timestamp.toISOString()}, period: ${period}`);
    const newLogRef = await addDoc(getTemperaturesCollectionRef(ownerUserId), {
      ownerUserId,
      timestamp: Timestamp.fromDate(timestamp),
      period,
      minTemperature,
      maxTemperature,
      averageTemperature,
      addedByUserId,
      addedByUserName,
      createdAt: serverTimestamp(),
    });
    console.log(`[firestoreService] Successfully added log with ID: ${newLogRef.id}`);
    return newLogRef.id;
  } catch (error) {
    console.error("[firestoreService] Error in addTemperatureLog:", error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error || "An unknown error occurred during log addition."));
    }
  }
};

export const getTemperatureLogsForMonth = async (userId: string, year: number, month: number): Promise<TemperatureLog[]> => {
  const monthDate = new Date(year, month - 1, 1);
  const firstDayOfMonth = startOfMonth(monthDate);
  const lastDayOfMonth = endOfMonth(monthDate);

  // Ensure the timestamps cover the entire first and last days of the month
  const startDate = startOfDay(firstDayOfMonth);
  const endDate = endOfDay(lastDayOfMonth);


  console.log(`[firestoreService] Fetching logs for ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const q = query(
    getTemperaturesCollectionRef(userId),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'asc') // Order by the reading timestamp
  );

  try {
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as TemperatureLog));
    console.log(`[firestoreService] Fetched ${logs.length} logs for the month.`);
    return logs;
  } catch (error) {
     console.error("[firestoreService] Error fetching logs for month:", error);
     throw error;
  }
};


export const deleteTemperatureLog = async (
  ownerUserId: string,
  logId: string,
  deletedByUserId: string,
  deletedByUserName: string | null
): Promise<void> => {
  if (!ownerUserId || !logId || !deletedByUserId) {
    throw new Error("Owner User ID, Log ID, and Deleting User ID are required for deletion.");
  }
  const logDocRef = doc(db, `users/${ownerUserId}/temperatures`, logId);
  
  console.log(`[firestoreService] Attempting to delete log: ${logId} for owner: ${ownerUserId} by user: ${deletedByUserId}`);

  const logDocSnap = await getDoc(logDocRef);

  if (logDocSnap.exists()) {
    const logData = logDocSnap.data() as Omit<TemperatureLog, 'id'>;
    console.log("[firestoreService] Original log data for deletion:", logData);
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(ownerUserId));

    // Construct the data for the deleted log, ensuring critical fields have fallbacks
    // This handles cases where older documents might not have these fields populated as expected by the current type
    const dataForDeletedLog: Omit<DeletedTemperatureLog, 'id'> = {
      ownerUserId: logData.ownerUserId || 'unknown_owner_uid', // Should always exist from TemperatureLog type
      timestamp: logData.timestamp || Timestamp.now(), // Fallback if somehow missing
      period: logData.period || 'other', 
      minTemperature: logData.minTemperature !== undefined ? logData.minTemperature : null,
      maxTemperature: logData.maxTemperature !== undefined ? logData.maxTemperature : null,
      averageTemperature: logData.averageTemperature !== undefined ? logData.averageTemperature : null,
      addedByUserId: typeof logData.addedByUserId === 'string' && logData.addedByUserId ? logData.addedByUserId : 'unknown_original_adder_uid', // Critical fix
      addedByUserName: logData.addedByUserName !== undefined ? logData.addedByUserName : null, // Ensure it's string or null
      createdAt: logData.createdAt || serverTimestamp() as Timestamp, // Fallback

      // Deletion-specific fields
      deletedAt: serverTimestamp() as Timestamp,
      originalLogId: logId,
      deletedByUserId: deletedByUserId,
      deletedByUserName: deletedByUserName,
    };
    
    console.log("[firestoreService] Data being written to deletedTemperatures:", dataForDeletedLog);

    batch.set(deletedLogRef, dataForDeletedLog);
    batch.delete(logDocRef);
    
    try {
      await batch.commit();
      console.log(`[firestoreService] Successfully moved log ${logId} to deletedTemperatures by user ${deletedByUserId}`);
    } catch (commitError) {
      console.error("[firestoreService] Error committing batch delete operation:", commitError);
      throw commitError;
    }
  } else {
    console.error(`[firestoreService] Log entry ${logId} not found for deletion for owner ${ownerUserId}.`);
    throw new Error('Log entry not found.');
  }
};

export const getDeletedTemperatureLogs = async (userId: string): Promise<DeletedTemperatureLog[]> => {
  const q = query(getDeletedTemperaturesCollectionRef(userId), orderBy('deletedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as DeletedTemperatureLog));
};

export const getAllTemperatureLogs = async (userId: string): Promise<TemperatureLog[]> => {
  const q = query(
    getTemperaturesCollectionRef(userId),
    orderBy('timestamp', 'desc') // Order by the reading timestamp
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as TemperatureLog));
};
