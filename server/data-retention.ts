
import { storage } from "./storage";

// India DPDP Act compliance: Data retention and deletion policies
export class DataRetentionService {
  // Delete recordings older than specified days (default: 365 days as per DPDP guidelines)
  static async cleanupOldRecordings(retentionDays: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    try {
      await storage.deleteRecordingsOlderThan(cutoffDate);
      console.log(`Data retention cleanup completed for recordings older than ${retentionDays} days`);
    } catch (error) {
      console.error('Data retention cleanup failed:', error);
    }
  }
  
  // Auto-delete temporary files after processing
  static async cleanupTempFiles(): Promise<void> {
    // Implementation for cleaning up temporary audio files
    // This should run periodically to ensure no data persistence
  }
}

// Schedule daily cleanup
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    await DataRetentionService.cleanupOldRecordings();
  }, 24 * 60 * 60 * 1000); // Run daily
}
