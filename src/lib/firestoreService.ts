
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
} from 'firebase/firestore';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

const getTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/temperatures`);
const getDeletedTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/deletedTemperatures`);

// Helper function to check if a log already exists for a specific date
const checkExistingLogForDate = async (userId: string, date: Date): Promise<boolean> => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const q = query(
    getTemperaturesCollectionRef(userId),
    where('date', '>=', Timestamp.fromDate(dayStart)),
    where('date', '<=', Timestamp.fromDate(dayEnd)),
    limit(1)
  );

  try {
    console.log(`[firestoreService] Checking for existing log for user ${userId} between ${dayStart.toISOString()} and ${dayEnd.toISOString()}`);
    const querySnapshot = await getDocs(q);
    console.log(`[firestoreService] Found ${querySnapshot.docs.length} existing logs for this date range.`);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("[firestoreService] Error in checkExistingLogForDate while querying Firestore:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(String(error || "Unknown error in checkExistingLogForDate"));
  }
};

export const addTemperatureLog = async (
  ownerUserId: string, // ID of the user who owns the data/fridge
  date: Date,
  calculatedMorningTemp: number | null,
  morningMinTemperature: number | null,
  morningMaxTemperature: number | null,
  calculatedEveningTemp: number | null,
  eveningMinTemperature: number | null,
  eveningMaxTemperature: number | null,
  addedByUserId: string, // ID of the user performing the action
  addedByUserName: string | null // Name of the user performing the action
): Promise<string> => {
  if (!ownerUserId) {
    console.error("[firestoreService] addTemperatureLog called with no ownerUserId.");
    throw new Error("Owner User ID is required to add a temperature log.");
  }
  if (!addedByUserId) {
    console.error("[firestoreService] addTemperatureLog called with no addedByUserId.");
    throw new Error("Adding User ID is required to add a temperature log.");
  }
  if (!date) {
    console.error("[firestoreService] addTemperatureLog called with no date.");
    throw new Error("Date is required to add a temperature log.");
  }
  console.log("[firestoreService] addTemperatureLog data received:", {
    ownerUserId, date, calculatedMorningTemp, morningMinTemperature, morningMaxTemperature,
    calculatedEveningTemp, eveningMinTemperature, eveningMaxTemperature, addedByUserId, addedByUserName
  });

  try {
    const existingLog = await checkExistingLogForDate(ownerUserId, date);
    if (existingLog) {
      console.log(`[firestoreService] Attempt to add duplicate log for date: ${date.toISOString()} by user ${addedByUserId} for owner ${ownerUserId}`);
      throw new Error("A temperature log for this date already exists. Please delete the existing log or choose a different date.");
    }

    console.log(`[firestoreService] Adding new log for owner user ${ownerUserId} (added by ${addedByUserId}) for date ${date.toISOString()}`);
    const newLogRef = await addDoc(getTemperaturesCollectionRef(ownerUserId), {
      userId: ownerUserId, // Keep this as the owner for querying purposes
      date: Timestamp.fromDate(date),
      morningTemperature: calculatedMorningTemp,
      morningMinTemperature,
      morningMaxTemperature,
      eveningTemperature: calculatedEveningTemp,
      eveningMinTemperature,
      eveningMaxTemperature,
      createdAt: serverTimestamp(),
      addedByUserId,
      addedByUserName,
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
  const monthDate = new Date(year, month -1, 1);
  const startDate = startOfDay(startOfMonth(monthDate));
  const endDate = endOfDay(endOfMonth(monthDate));

  console.log(`[firestoreService] Fetching logs for ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  const q = query(
    getTemperaturesCollectionRef(userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'asc')
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
    throw new Error("User ID, Log ID, and Deleting User ID are required for deletion.");
  }
  const logDocRef = doc(db, `users/${ownerUserId}/temperatures`, logId);
  const logDocSnap = await getDoc(logDocRef);

  if (logDocSnap.exists()) {
    const logData = logDocSnap.data() as Omit<TemperatureLog, 'id'>;
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(ownerUserId));
    batch.set(deletedLogRef, {
      ...logData,
      userId: logData.userId, // This is the ownerUserId
      date: logData.date,
      morningTemperature: logData.morningTemperature !== undefined ? logData.morningTemperature : null,
      morningMinTemperature: logData.morningMinTemperature !== undefined ? logData.morningMinTemperature : null,
      morningMaxTemperature: logData.morningMaxTemperature !== undefined ? logData.morningMaxTemperature : null,
      eveningTemperature: logData.eveningTemperature !== undefined ? logData.eveningTemperature : null,
      eveningMinTemperature: logData.eveningMinTemperature !== undefined ? logData.eveningMinTemperature : null,
      eveningMaxTemperature: logData.eveningMaxTemperature !== undefined ? logData.eveningMaxTemperature : null,
      createdAt: logData.createdAt || serverTimestamp(),
      addedByUserId: logData.addedByUserId,
      addedByUserName: logData.addedByUserName,
      deletedAt: serverTimestamp(),
      originalLogId: logId,
      deletedByUserId,
      deletedByUserName,
    });
    batch.delete(logDocRef);
    await batch.commit();
    console.log(`[firestoreService] Moved log ${logId} to deletedTemperatures by user ${deletedByUserId}`);
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
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as TemperatureLog));
};
