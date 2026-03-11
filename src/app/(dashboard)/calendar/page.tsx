"use client";

import { WeeklyCalendar } from "@/components/WeeklyCalendar";

export default function CalendarPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          Calendar
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Weekly view of scheduled tasks and cron jobs
        </p>
      </div>

      <WeeklyCalendar />
    </div>
  );
}
