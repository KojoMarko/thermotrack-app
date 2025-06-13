
import type { Timestamp } from 'firebase/firestore';

export interface TemperatureLog {
  id: string;
  ownerUserId: string;
  timestamp: Timestamp; // Full timestamp of the reading
  period: 'morning' | 'evening' | 'other';
  minTemperature: number | null;
  maxTemperature: number | null;
  averageTemperature: number | null; // Calculated from min/max or single entry
  createdAt: Timestamp; // Firestore server timestamp of document creation
  addedByUserId: string;
  addedByUserName: string | null;
}

export interface DeletedTemperatureLog extends Omit<TemperatureLog, 'id' | 'ownerUserId'> {
  id: string;
  ownerUserId: string; // Ensure this is part of DeletedTemperatureLog
  deletedAt: Timestamp;
  originalLogId: string;
  deletedByUserId: string;
  deletedByUserName: string | null;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

// New type for aggregated data passed to charts and summaries
export interface AggregatedDailyLog {
  date: Date; // JavaScript Date object representing the day
  morningTemperature: number | null; // Avg of morning avg temps for the day
  morningMinTemperature: number | null; // Min of morning min temps for the day
  morningMaxTemperature: number | null; // Max of morning max temps for the day
  eveningTemperature: number | null; // Avg of evening avg temps for the day
  eveningMinTemperature: number | null; // Min of evening min temps for the day
  eveningMaxTemperature: number | null; // Max of evening max temps for the day
}
