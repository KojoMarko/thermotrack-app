
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
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'; // Corrected import

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
    // Rethrow to ensure the calling function's finally block is executed.
    if (error instanceof Error) {
        throw error;
    }
    throw new Error(String(error || "Unknown error in checkExistingLogForDate"));
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
  console.log("[firestoreService] addTemperatureLog data received:", {
    userId, date, calculatedMorningTemp, morningMinTemperature, morningMaxTemperature,
    calculatedEveningTemp, eveningMinTemperature, eveningMaxTemperature
  });

  try {
    const existingLog = await checkExistingLogForDate(userId, date);
    if (existingLog) {
      console.log(`[firestoreService] Attempt to add duplicate log for date: ${date.toISOString()} by user ${userId}`);
      throw new Error("A temperature log for this date already exists. Please delete the existing log or choose a different date.");
    }

    console.log(`[firestoreService] Adding new log for user ${userId} for date ${date.toISOString()}`);
    const newLogRef = await addDoc(getTemperaturesCollectionRef(userId), {
      userId,
      date: Timestamp.fromDate(date), // Ensure date is a Firestore Timestamp
      morningTemperature: calculatedMorningTemp,
      morningMinTemperature,
      morningMaxTemperature,
      eveningTemperature: calculatedEveningTemp,
      eveningMinTemperature,
      eveningMaxTemperature,
      createdAt: serverTimestamp(), // Firestore server-side timestamp
    });
    console.log(`[firestoreService] Successfully added log with ID: ${newLogRef.id}`);
    return newLogRef.id;
  } catch (error) {
    console.error("[firestoreService] Error in addTemperatureLog:", error);
    // Ensure the error is re-thrown so the form's catch block can handle it
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error || "An unknown error occurred during log addition."));
    }
  }
};

export const getTemperatureLogsForMonth = async (userId: string, year: number, month: number): Promise<TemperatureLog[]> => {
  const monthDate = new Date(year, month -1, 1); // month is 1-indexed
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
     throw error; // Rethrow so UI can handle it
  }
};


export const deleteTemperatureLog = async (userId: string, logId: string): Promise<void> => {
  const logDocRef = doc(db, `users/${userId}/temperatures`, logId);
  const logDocSnap = await getDoc(logDocRef);

  if (logDocSnap.exists()) {
    const logData = logDocSnap.data() as Omit<TemperatureLog, 'id' | 'createdAt'> & { createdAt?: Timestamp }; // createdAt might be pending write
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(userId));
    batch.set(deletedLogRef, {
      ...logData,
      // Ensure all fields from TemperatureLog are present, even if null
      userId: logData.userId,
      date: logData.date, // This is already a Timestamp
      morningTemperature: logData.morningTemperature !== undefined ? logData.morningTemperature : null,
      morningMinTemperature: logData.morningMinTemperature !== undefined ? logData.morningMinTemperature : null,
      morningMaxTemperature: logData.morningMaxTemperature !== undefined ? logData.morningMaxTemperature : null,
      eveningTemperature: logData.eveningTemperature !== undefined ? logData.eveningTemperature : null,
      eveningMinTemperature: logData.eveningMinTemperature !== undefined ? logData.eveningMinTemperature : null,
      eveningMaxTemperature: logData.eveningMaxTemperature !== undefined ? logData.eveningMaxTemperature : null,
      createdAt: logData.createdAt || serverTimestamp(), // Use existing or new server timestamp
      deletedAt: serverTimestamp(),
      originalLogId: logId,
    });
    batch.delete(logDocRef);
    await batch.commit();
    console.log(`[firestoreService] Moved log ${logId} to deletedTemperatures`);
  } else {
    console.error(`[firestoreService] Log entry ${logId} not found for deletion.`);
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

