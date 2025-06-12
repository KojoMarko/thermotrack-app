
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
import { startOfDay, endOfDay } from 'date-fns';

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
    throw error; // Rethrow to be caught by the calling function
  }
};

export const addTemperatureLog = async (
  userId: string,
  date: Date,
  calculatedMorningTemp: number | null,
  morningMinTemperature: number | null,
  morningMaxTemperature: number | null,
  calculatedEveningTemp: number | null,
  eveningMinTemperature: number | null,
  eveningMaxTemperature: number | null
): Promise<string> => {
  if (!userId) {
    console.error("[firestoreService] addTemperatureLog called with no userId.");
    throw new Error("User ID is required to add a temperature log.");
  }
  if (!date) {
    console.error("[firestoreService] addTemperatureLog called with no date.");
    throw new Error("Date is required to add a temperature log.");
  }

  try {
    const existingLog = await checkExistingLogForDate(userId, date);
    if (existingLog) {
      console.log(`[firestoreService] Attempt to add duplicate log for date: ${date.toISOString()} by user ${userId}`);
      throw new Error("A temperature log for this date already exists. Please delete the existing log to add a new one.");
    }

    console.log(`[firestoreService] Adding new log for user ${userId} for date ${date.toISOString()}`);
    const newLogRef = await addDoc(getTemperaturesCollectionRef(userId), {
      userId,
      date: Timestamp.fromDate(date),
      morningTemperature: calculatedMorningTemp,
      morningMinTemperature,
      morningMaxTemperature,
      eveningTemperature: calculatedEveningTemp,
      eveningMinTemperature,
      eveningMaxTemperature,
      createdAt: serverTimestamp(),
    });
    console.log(`[firestoreService] Successfully added log with ID: ${newLogRef.id}`);
    return newLogRef.id;
  } catch (error) {
    console.error("[firestoreService] Error in addTemperatureLog:", error);
    if (error instanceof Error) {
      throw error; // Rethrow if already an Error instance
    } else {
      // Wrap non-Error types in an Error object to ensure error.message is available
      throw new Error(String(error || "An unknown error occurred during log addition."));
    }
  }
};

export const getTemperatureLogsForMonth = async (userId: string, year: number, month: number): Promise<TemperatureLog[]> => {
  const monthDate = new Date(year, month -1, 1);
  const startDate = startOfDay(startOfMonth(monthDate)); // Use startOfDay for consistency
  const endDate = endOfDay(endOfMonth(monthDate));     // Use endOfDay for consistency

  const q = query(
    getTemperaturesCollectionRef(userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as TemperatureLog));
};


export const deleteTemperatureLog = async (userId: string, logId: string): Promise<void> => {
  const logDocRef = doc(db, `users/${userId}/temperatures`, logId);
  const logDocSnap = await getDoc(logDocRef);

  if (logDocSnap.exists()) {
    const logData = logDocSnap.data() as Omit<TemperatureLog, 'id'>;
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(userId));
    batch.set(deletedLogRef, {
      ...logData,
      date: logData.date,
      morningTemperature: logData.morningTemperature,
      morningMinTemperature: logData.morningMinTemperature === undefined ? null : logData.morningMinTemperature,
      morningMaxTemperature: logData.morningMaxTemperature === undefined ? null : logData.morningMaxTemperature,
      eveningTemperature: logData.eveningTemperature,
      eveningMinTemperature: logData.eveningMinTemperature === undefined ? null : logData.eveningMinTemperature,
      eveningMaxTemperature: logData.eveningMaxTemperature === undefined ? null : logData.eveningMaxTemperature,
      createdAt: logData.createdAt,
      userId: logData.userId,
      deletedAt: serverTimestamp(),
      originalLogId: logId,
    });
    batch.delete(logDocRef);
    await batch.commit();
  } else {
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
