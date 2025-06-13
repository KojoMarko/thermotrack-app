
import type { Timestamp } from 'firebase/firestore';

export interface TemperatureLog {
  id: string;
  userId: string; // The ID of the user who owns this log (used for querying)
  date: Timestamp;
  morningTemperature: number | null;
  morningMinTemperature: number | null;
  morningMaxTemperature: number | null;
  eveningTemperature: number | null;
  eveningMinTemperature: number | null;
  eveningMaxTemperature: number | null;
  createdAt: Timestamp;
  addedByUserId: string; // ID of the user who actually added this log
  addedByUserName: string | null; // Display name of the user who added this log
}

export interface DeletedTemperatureLog extends TemperatureLog {
  deletedAt: Timestamp;
  originalLogId: string;
  deletedByUserId: string; // ID of the user who deleted this log
  deletedByUserName: string | null; // Display name of the user who deleted this log
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

