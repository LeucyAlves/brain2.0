"use client";

import { useEffect, useState } from "react";
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface Task {
  id: string;
  name: string;
  schedule: string;
  description: string;
  nextRun: string;
}

export function WeeklyCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setTasks)
      .catch(() => setTasks([]));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getTasksForDayAndHour = (day: Date, hour: number) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.nextRun);
      return isSameDay(taskDate, day) && taskDate.getHours() === hour;
    });
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            Hoje
          </button>
        </div>

        <h2
          className="text-lg font-medium"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
        >
          {format(currentWeekStart, "MMMM yyyy")}
        </h2>

        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Calendar className="w-4 h-4" />
          <span>{tasks.length} tarefas agendadas</span>
        </div>
      </div>

      {/* Day Headers */}
      <div
        className="grid grid-cols-8"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="p-3 text-center text-sm"
          style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
        >
          Hora
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="p-3 text-center"
            style={{
              borderRight: '1px solid var(--border)',
              ...(isSameDay(day, new Date()) ? { backgroundColor: 'var(--accent-soft)' } : {}),
            }}
          >
            <div
              className="text-xs uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              {format(day, "EEE")}
            </div>
            <div
              className="text-lg font-medium"
              style={{
                color: isSameDay(day, new Date()) ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid - Show 6am to 10pm */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.filter(h => h >= 6 && h <= 22).map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-8"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="p-2 text-xs text-right pr-3"
              style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}
            >
              {format(new Date().setHours(hour, 0), "HH:mm")}
            </div>
            {days.map((day) => {
              const dayTasks = getTasksForDayAndHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="p-1 min-h-[48px]"
                  style={{
                    borderRight: '1px solid var(--border)',
                    ...(isSameDay(day, new Date()) ? { backgroundColor: 'var(--accent-soft)' } : {}),
                  }}
                >
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-2 py-1 rounded text-xs mb-1"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        borderLeft: '2px solid var(--accent)',
                      }}
                    >
                      <div
                        className="font-medium truncate"
                        style={{ color: 'var(--accent)' }}
                      >
                        {task.name}
                      </div>
                      <div
                        className="truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {task.schedule}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
