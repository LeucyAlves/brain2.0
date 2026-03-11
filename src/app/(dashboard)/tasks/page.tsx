"use client";

import { TaskBoard } from "@/components/TaskBoard";

export default function TasksPage() {
    return (
        <div style={{
            maxWidth: "calc(100vw - 68px - 48px)",
            overflow: "hidden",
            padding: "0",
        }}>
            <TaskBoard />
        </div>
    );
}
