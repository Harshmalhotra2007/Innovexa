/**
 * Calendar Monitor for Google Calendar OAuth polling
 * Scans user calendars for upcoming meetings and queues agent jobs.
 */
const { google } = require('googleapis');

class CalendarMonitor {
  constructor(oauth2Client, prisma) {
    this.oauth2Client = oauth2Client;
    this.prisma = prisma;
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Poll calendar for upcoming meetings in the next window
   * @param {number} lookaheadMinutes - How far ahead to look for meetings
   * @returns {Promise<Array>} - Array of meeting events to process
   */
async function pollUpcomingMeetings(lookaheadMinutes = 30) {
  const now = new Date();
  const future = new Date(now.getTime() + lookaheadMinutes * 60000);

  try {
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    const events = response.data.items || [];
    console.log(`[CalendarMonitor] Found ${events.length} upcoming events`);

    // Filter for Google Meet events and map to our schema
    const meetEvents = events.filter(e => e.hangoutLink || (e.conferenceData && e.conferenceData.entryPoints));
    
    return meetEvents.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Meeting',
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      meetUrl: event.hangoutLink,
      attendees: event.attendees?.map(a => a.email) || [],
      organizer: event.organizer?.email
    }));
  } catch (error) {
    console.error('[CalendarMonitor] Calendar polling error:', error);
    return [];
  }
}

/**
 * Queue meeting for AI Agent processing
 */
async function queueMeetingForProcessing(meetingEvent, userId) {
  // Check if already exists in DB
  const existing = await this.prisma.meeting.findFirst({
    where: { agenda: meetingEvent.meetUrl }
  });

  if (existing) {
    console.log(`[CalendarMonitor] Meeting already queued: ${existing.id}`);
    return existing;
  }

  // Create meeting record
  const meeting = await this.prisma.meeting.create({
    data: {
      title: meetingEvent.title,
      date: new Date(meetingEvent.startTime),
      durationMins: Math.round((new Date(meetingEvent.endTime) - new Date(meetingEvent.startTime)) / 60000),
      agenda: meetingEvent.meetUrl,
      status: 'Scheduled'
    }
  });

  console.log(`[CalendarMonitor] Queued meeting: ${meeting.id} - ${meeting.title}`);
  return meeting;
}

module.exports = { CalendarMonitor, pollUpcomingMeetings, queueMeetingForProcessing };