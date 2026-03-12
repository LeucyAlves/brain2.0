"use client";

import { t } from "@/lib/i18n";
import { GripVertical, FileText, MessageSquare } from "lucide-react";

interface TaskCardProps {
    task: {
        id: string;
        title: string;
        description: string | null;
        priority: string;
        assigned_agent: string | null;
        created_at: string;
        output?: string | null;
        comments_count?: number;
    };
    agents: Array<{ id: string; name: string; emoji: string; color: string }>;
    onEdit: (taskId: string) => void;
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: "Low", color: "#8A8A8A", bg: "rgba(138, 138, 138, 0.125)" },
    medium: { label: "Medium", color: "#0A84FF", bg: "rgba(10, 132, 255, 0.125)" },
    high: { label: "High", color: "#FF9F0A", bg: "rgba(255, 159, 10, 0.125)" },
    urgent: { label: "Urgent", color: "#FF453A", bg: "rgba(255, 69, 58, 0.125)" },
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return t("just now");
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

export function TaskCard({ task, agents, onEdit, onDragStart }: TaskCardProps) {
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const agent = agents.find((a) => a.id === task.assigned_agent);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={() => onEdit(task.id)}
            style={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${priority.color}`,
                borderRadius: "6px",
                padding: "8px",
                cursor: "grab",
                transition: "all 150ms ease",
                position: "relative",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            {/* Drag handle */}
            <div
                style={{
                    position: "absolute",
                    top: "8px",
                    right: "6px",
                    color: "var(--text-muted)",
                    opacity: 0.4,
                }}
            >
                <GripVertical style={{ width: "14px", height: "14px" }} />
            </div>

            {/* Title */}
            <div
                style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    paddingRight: "18px",
                    lineHeight: 1.4,
                }}
            >
                {task.title}
            </div>

            {/* Description preview */}
            {task.description && (
                <div
                    className="line-clamp-2"
                    style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        marginBottom: "8px",
                        lineHeight: 1.5,
                    }}
                >
                    {task.description}
                </div>
            )}

            {/* Footer: priority + agent + time */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                }}
            >
                {/* Priority badge */}
                <span
                    style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: priority.bg,
                        color: priority.color,
                    }}
                >
                    {t(priority.label)}
                </span>

                {/* Agent badge */}
                {agent && (
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: 500,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: `${agent.color}20`,
                            color: agent.color,
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                        }}
                    >
                        {agent.emoji} {agent.name}
                    </span>
                )}

                {/* Indicators */}
                {(task.output || (task.comments_count && task.comments_count > 0)) && (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "4px" }}>
                        {task.output && (
                            <FileText style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
                        )}
                        {task.comments_count && task.comments_count > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--text-muted)" }}>
                                <MessageSquare style={{ width: "12px", height: "12px" }} />
                                <span style={{ fontSize: "10px", fontWeight: 600 }}>{task.comments_count}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Time */}
                <span
                    style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                    }}
                >
                    {timeAgo(task.created_at)}
                </span>
            </div>
        </div>
    );
}
