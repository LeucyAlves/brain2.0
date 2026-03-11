"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assigned_agent: string | null;
}

interface Agent {
    id: string;
    name: string;
    emoji: string;
    color: string;
}

interface TaskModalProps {
    task: Task | null; // null = create mode
    defaultStatus?: string;
    agents: Agent[];
    onSave: (data: Partial<Task> & { title: string }) => void;
    onDelete?: (taskId: string) => void;
    onClose: () => void;
}

const statuses = [
    { value: "backlog", label: "Backlog", emoji: "📥" },
    { value: "sprint", label: "Sprint", emoji: "🏃" },
    { value: "todo", label: "To Do", emoji: "📋" },
    { value: "review", label: "In Review", emoji: "🔍" },
    { value: "correction", label: "Correction", emoji: "🔧" },
    { value: "done", label: "Done", emoji: "✅" },
];

const priorities = [
    { value: "low", label: "Low", color: "#8A8A8A" },
    { value: "medium", label: "Medium", color: "#0A84FF" },
    { value: "high", label: "High", color: "#FF9F0A" },
    { value: "urgent", label: "Urgent", color: "#FF453A" },
];

export function TaskModal({ task, defaultStatus, agents, onSave, onDelete, onClose }: TaskModalProps) {
    const isEditing = !!task;
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [status, setStatus] = useState(task?.status || defaultStatus || "backlog");
    const [priority, setPriority] = useState(task?.priority || "medium");
    const [assignedAgent, setAssignedAgent] = useState(task?.assigned_agent || "");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        onSave({
            ...(task ? { id: task.id } : {}),
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            assigned_agent: assignedAgent || null,
        });
    };

    const handleDelete = () => {
        if (task && onDelete) {
            onDelete(task.id);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "10px 14px",
        color: "var(--text-primary)",
        fontSize: "14px",
        outline: "none",
        transition: "border-color 150ms ease",
    };

    const labelStyle: React.CSSProperties = {
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--text-secondary)",
        marginBottom: "6px",
        display: "block",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "520px",
                    maxHeight: "90vh",
                    overflow: "auto",
                    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "20px 24px 16px",
                        borderBottom: "1px solid var(--border)",
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                        }}
                    >
                        {isEditing ? t("Edit Task") : t("New Task")}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            display: "flex",
                            transition: "all 150ms ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                            e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-muted)";
                        }}
                    >
                        <X style={{ width: "20px", height: "20px" }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Title */}
                        <div>
                            <label style={labelStyle}>{t("Title")}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t("Task title...")}
                                required
                                autoFocus
                                style={inputStyle}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label style={labelStyle}>{t("Description")}</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("Add details...")}
                                rows={3}
                                style={{
                                    ...inputStyle,
                                    resize: "vertical",
                                    minHeight: "80px",
                                    fontFamily: "var(--font-body)",
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                            />
                        </div>

                        {/* Status + Priority row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label style={labelStyle}>{t("Status")}</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    style={{ ...inputStyle, cursor: "pointer" }}
                                >
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.emoji} {t(s.label)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>{t("Priority")}</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    style={{ ...inputStyle, cursor: "pointer" }}
                                >
                                    {priorities.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {t(p.label)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Agent */}
                        <div>
                            <label style={labelStyle}>{t("Assigned Agent")}</label>
                            <select
                                value={assignedAgent}
                                onChange={(e) => setAssignedAgent(e.target.value)}
                                style={{ ...inputStyle, cursor: "pointer" }}
                            >
                                <option value="">{t("Unassigned")}</option>
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.emoji} {agent.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "24px",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--border)",
                        }}
                    >
                        {/* Delete */}
                        <div>
                            {isEditing && onDelete && (
                                <>
                                    {!showDeleteConfirm ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-muted)",
                                                cursor: "pointer",
                                                padding: "8px",
                                                borderRadius: "6px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                fontSize: "13px",
                                                transition: "all 150ms ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = "var(--negative)";
                                                e.currentTarget.style.backgroundColor = "var(--negative-soft)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = "var(--text-muted)";
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            <Trash2 style={{ width: "14px", height: "14px" }} />
                                            {t("Delete")}
                                        </button>
                                    ) : (
                                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                            <span style={{ fontSize: "12px", color: "var(--negative)" }}>
                                                {t("Confirm?")}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="btn-danger"
                                                style={{ padding: "6px 12px", fontSize: "12px" }}
                                            >
                                                {t("Yes, delete")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="btn-outline"
                                                style={{ padding: "6px 12px", fontSize: "12px" }}
                                            >
                                                {t("Cancel")}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Save / Cancel */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-outline"
                                style={{ padding: "8px 16px", fontSize: "13px" }}
                            >
                                {t("Cancel")}
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className="btn-primary"
                                style={{
                                    padding: "8px 20px",
                                    fontSize: "13px",
                                    opacity: title.trim() ? 1 : 0.5,
                                }}
                            >
                                {isEditing ? t("Save") : t("Create")}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
