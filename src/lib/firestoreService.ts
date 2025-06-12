
import { db, auth } from '@/lib/firebase';
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
} from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';

const getTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/temperatures`);
const getDeletedTemperaturesCollectionRef = (userId: string) => collection(db, `users/${userId}/deletedTemperatures`);

export const addTemperatureLog = async (
  userId: string,
  date: Date,
  morningTemperature: number | null,
  eveningTemperature: number | null
): Promise<string> => {
  if (!morningTemperature && !eveningTemperature) {
    throw new Error("At least one temperature reading (morning or evening) is required.");
  }
  const newLogRef = await addDoc(getTemperaturesCollectionRef(userId), {
    userId,
    date: Timestamp.fromDate(date),
    morningTemperature,
    eveningTemperature,
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
  const logSnapshot = await getDocs(query(collection(db, `users/${userId}/temperatures`), where('__name__', '==', logId)));


  if (!logSnapshot.empty) {
    const logData = logSnapshot.docs[0].data() as Omit<TemperatureLog, 'id'>;
    const batch = writeBatch(db);

    const deletedLogRef = doc(getDeletedTemperaturesCollectionRef(userId));
    batch.set(deletedLogRef, {
      ...logData,
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
