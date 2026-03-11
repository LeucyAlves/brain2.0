"use client";

import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Plus } from "lucide-react";
import { t } from "@/lib/i18n";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_agent: string | null;
    created_at: string;
    updated_at: string;
    position: number;
}

interface Agent {
    id: string;
    name: string;
    emoji: string;
    color: string;
}

interface TaskColumnProps {
    status: string;
    label: string;
    emoji: string;
    color: string;
    tasks: Task[];
    agents: Agent[];
    onEditTask: (taskId: string) => void;
    onDropTask: (taskId: string, newStatus: string) => void;
    onQuickAdd: (status: string) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export function TaskColumn({
    status,
    label,
    emoji,
    color,
    tasks,
    agents,
    onEditTask,
    onDropTask,
    onQuickAdd,
    onDragStart,
}: TaskColumnProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only set false if actually leaving the column (not entering a child)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData("text/plain");
        if (taskId) {
            onDropTask(taskId, status);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                minWidth: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                borderRadius: "12px",
                backgroundColor: isDragOver ? "var(--surface-hover)" : "var(--surface)",
                border: isDragOver ? `2px dashed ${color}` : "1px solid var(--border)",
                transition: "all 200ms ease",
                maxHeight: "calc(100vh - 220px)",
            }}
        >
            {/* Column Header */}
            <div
                style={{
                    padding: "10px 10px 8px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, overflow: "hidden" }}>
                    <span style={{ fontSize: "13px", flexShrink: 0 }}>{emoji}</span>
                    <span
                        style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {t(label)}
                    </span>
                    <span
                        style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "1px 7px",
                            borderRadius: "10px",
                            backgroundColor: `${color}25`,
                            color: color,
                            minWidth: "20px",
                            textAlign: "center",
                        }}
                    >
                        {tasks.length}
                    </span>
                </div>

                <button
                    onClick={() => onQuickAdd(status)}
                    style={{
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 150ms ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                        e.currentTarget.style.color = color;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-muted)";
                    }}
                    title={t("New Task")}
                >
                    <Plus style={{ width: "16px", height: "16px" }} />
                </button>
            </div>

            {/* Cards */}
            <div
                style={{
                    padding: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    overflowY: "auto",
                    flex: 1,
                    minHeight: "80px",
                }}
            >
                {tasks.length === 0 && (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "24px 12px",
                            color: "var(--text-muted)",
                            fontSize: "12px",
                        }}
                    >
                        {isDragOver ? t("Drop here") : t("No tasks")}
                    </div>
                )}

                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        agents={agents}
                        onEdit={onEditTask}
                        onDragStart={onDragStart}
                    />
                ))}
            </div>
        </div>
    );
}
