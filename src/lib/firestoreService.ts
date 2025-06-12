
import { db } from '@/lib/firebase'; // Removed auth as it's not used directly here
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
  getDoc, // Added getDoc for fetching a single document
} from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';

const getTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/temperatures`);
const getDeletedTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/deletedTemperatures`);

export const addTemperatureLog = async (
  userId: string,
  date: Date,
  morningTemperature: number | null,
  morningMinTemperature: number | null,
  morningMaxTemperature: number | null,
  eveningTemperature: number | null,
  eveningMinTemperature: number | null,
  eveningMaxTemperature: number | null
): Promise<string> => {
  if (morningTemperature === null && eveningTemperature === null) {
    throw new Error("At least one primary temperature reading (morning or evening) is required.");
  }
  const newLogRef = await addDoc(getTemperaturesCollectionRef(userId), {
    userId,
    date: Timestamp.fromDate(date),
    morningTemperature,
    morningMinTemperature,
    morningMaxTemperature,
    eveningTemperature,
    eveningMinTemperature,
    eveningMaxTemperature,
    createdAt: serverTimestamp(),
  });
  return newLogRef.id;
};

export const getTemperatureLogsForMonth = async (userId: string, year: number, month: number): Promise<TemperatureLog[]> => {
  const monthDate = new Date(year, month -1, 1); // month is 1-indexed
  const startDate = startOfMonth(monthDate);
  const endDate = endOfMonth(monthDate);

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
  // Fetch the specific document to ensure it exists and to get its data
  const logDocSnap = await getDoc(logDocRef);


  if (logDocSnap.exists()) {
    const logData = logDocSnap.data() as Omit<TemperatureLog, 'id'>; // Cast to the type, excluding id
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(userId)); // Auto-generate ID for deleted log
    batch.set(deletedLogRef, {
      ...logData, // Spread the original log data
      // Ensure all fields from TemperatureLog are explicitly handled or spread
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

// Helper to get all temperature logs for a user, potentially for AI context or full history.
export const getAllTemperatureLogs = async (userId: string): Promise<TemperatureLog[]> => {
  const q = query(
    getTemperaturesCollectionRef(userId),
    orderBy('date', 'desc') // Get most recent first
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as TemperatureLog));
};
