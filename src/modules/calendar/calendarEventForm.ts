import type { CalendarEventType } from '../../domain/calendar';

export type CreateEventForm = {
  title: string;
  companyId: string;
  type: CalendarEventType;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  visibility: 'internal' | 'client';
  staffVisible: boolean;
  mode: 'remote' | 'in_person';
  location: string;
  meetingUrl: string;
  description: string;
  attendeeEmails: string;
  reminderMinutes: number;
  autoTranscription: boolean;
};
