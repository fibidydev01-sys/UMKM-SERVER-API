import { Injectable } from '@nestjs/common';
import { AutoReplyRule } from '@prisma/client';

interface WorkingHours {
  start: string; // "09:00"
  end: string; // "21:00"
  timezone: string; // "Asia/Jakarta"
  days?: number[]; // [1,2,3,4,5] = Mon-Fri
}

@Injectable()
export class TimeBasedEngine {
  /**
   * Check if current time is outside working hours
   */
  isOutsideWorkingHours(rule: AutoReplyRule): boolean {
    if (!rule.workingHours) {
      return false;
    }

    const workingHours = rule.workingHours as unknown as WorkingHours;
    const now = new Date();

    // Get current day (0 = Sunday, 6 = Saturday)
    const currentDay = now.getDay();

    // Get current time in "HH:MM" format
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    // Check if today is a working day
    const workingDays = workingHours.days || [1, 2, 3, 4, 5]; // Default Mon-Fri
    if (!workingDays.includes(currentDay)) {
      return true; // Outside working days
    }

    // Check time range
    const start = workingHours.start; // "09:00"
    const end = workingHours.end; // "21:00"

    // Convert to comparable numbers (e.g., "09:00" -> 900)
    const currentTimeNum = this.timeToNumber(currentTime);
    const startTimeNum = this.timeToNumber(start);
    const endTimeNum = this.timeToNumber(end);

    // Check if current time is outside range
    return currentTimeNum < startTimeNum || currentTimeNum > endTimeNum;
  }

  /**
   * Convert time string to comparable number
   * "09:00" -> 900
   * "21:30" -> 2130
   */
  private timeToNumber(time: string): number {
    return parseInt(time.replace(':', ''), 10);
  }

  /**
   * Get human-readable status
   */
  getWorkingHoursStatus(rule: AutoReplyRule): {
    isOutsideHours: boolean;
    message: string;
  } {
    const isOutside = this.isOutsideWorkingHours(rule);
    const workingHours = rule.workingHours as unknown as WorkingHours;

    if (!workingHours) {
      return {
        isOutsideHours: false,
        message: 'No working hours configured',
      };
    }

    if (isOutside) {
      return {
        isOutsideHours: true,
        message: `Outside working hours (${workingHours.start} - ${workingHours.end})`,
      };
    }

    return {
      isOutsideHours: false,
      message: `Within working hours (${workingHours.start} - ${workingHours.end})`,
    };
  }
}
