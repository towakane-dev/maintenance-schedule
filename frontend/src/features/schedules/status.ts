import { Schedule } from '../../shared/api';
import { addDays } from '../../shared/date';

export function scheduleStatus(schedule: Schedule, today: string) {
  if (schedule.complete) return 'Completed';
  if (schedule.due.slice(0, 10) < today) return 'Overdue';
  return schedule.due.slice(0, 10) <= addDays(today, 7) ? 'Upcoming' : 'Pending';
}
