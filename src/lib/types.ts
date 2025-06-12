
import type { Timestamp } from 'firebase/firestore';

export interface TemperatureLog {
  id: string;
  userId: string;
  date: Timestamp;
  morningTemperature: number | null;
  morningMinTemperature: number | null;
  morningMaxTemperature: number | null;
  eveningTemperature: number | null;
  eveningMinTemperature: number | null;
  eveningMaxTemperature: number | null;
  createdAt: Timestamp;
}

export interface DeletedTemperatureLog extends TemperatureLog {
  deletedAt: Timestamp;
  originalLogId: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}
