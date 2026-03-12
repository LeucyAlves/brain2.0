"use client";

import { useEffect, useState, useCallback } from "react";
import { TaskColumn } from "./TaskColumn";
import { TaskModal } from "./TaskModal";
import { Plus, Filter } from "lucide-react";
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
    output?: string | null;
    comments_count?: number;
}

interface Agent {
    id: string;
    name: string;
    emoji: string;
    color: string;
}

const COLUMNS = [
    { value: "backlog", label: "Backlog", emoji: "📥", color: "#525252" },
    { value: "sprint", label: "Sprint", emoji: "🏃", color: "#0A84FF" },
    { value: "todo", label: "To Do", emoji: "📋", color: "#FFD60A" },
    { value: "review", label: "In Review", emoji: "🔍", color: "#a78bfa" },
    { value: "correction", label: "Correction", emoji: "🔧", color: "#FF453A" },
    { value: "done", label: "Done", emoji: "✅", color: "#32D74B" },
];

export function TaskBoard() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalState, setModalState] = useState<{
        open: boolean;
        task: Task | null;
        defaultStatus?: string;
    }>({ open: false, task: null });

    // Filters
    const [filterAgent, setFilterAgent] = useState<string>("");
    const [filterPriority, setFilterPriority] = useState<string>("");

    // Drag state
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filterAgent) params.set("agent", filterAgent);
            if (filterPriority) params.set("priority", filterPriority);

            const res = await fetch(`/api/tasks?${params.toString()}`);
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    }, [filterAgent, filterPriority]);

    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch("/api/agents");
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (err) {
            console.error("Failed to fetch agents:", err);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchAgents();
    }, [fetchTasks, fetchAgents]);

    // --- Handlers ---

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("text/plain", taskId);
        e.dataTransfer.effectAllowed = "move";
        setDraggedTaskId(taskId);

        // Make the drag image semi-transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    };

    // Reset opacity on drag end (delegate via window)
    useEffect(() => {
        const handleDragEnd = () => {
            setDraggedTaskId(null);
            // Reset all card opacities
            document.querySelectorAll('[draggable="true"]').forEach((el) => {
                (el as HTMLElement).style.opacity = "1";
            });
        };
        window.addEventListener("dragend", handleDragEnd);
        return () => window.removeEventListener("dragend", handleDragEnd);
    }, []);

    const handleDropTask = async (taskId: string, newStatus: string) => {
        // Optimistic update
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
            )
        );

        try {
            await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: taskId, status: newStatus }),
            });
            // Refresh to get updated positions
            fetchTasks();
        } catch (err) {
            console.error("Failed to move task:", err);
            fetchTasks(); // Rollback
        }
    };

    const handleSaveTask = async (data: Partial<Task> & { title: string }) => {
        try {
            if (data.id) {
                // Update
                await fetch("/api/tasks", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
            } else {
                // Create
                await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
            }
            setModalState({ open: false, task: null });
            fetchTasks();
        } catch (err) {
            console.error("Failed to save task:", err);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
            setModalState({ open: false, task: null });
            fetchTasks();
        } catch (err) {
            console.error("Failed to delete task:", err);
        }
    };

    const handleEditTask = (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
            setModalState({ open: true, task });
        }
    };

    const handleQuickAdd = (status: string) => {
        setModalState({ open: true, task: null, defaultStatus: status });
    };

    // Group tasks by status
    const tasksByStatus = COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
        acc[col.value] = tasks
            .filter((t) => t.status === col.value)
            .sort((a, b) => a.position - b.position);
        return acc;
    }, {});

    const totalTasks = tasks.length;
    const doneTasks = tasksByStatus["done"]?.length || 0;

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "400px",
                    color: "var(--text-muted)",
                    fontSize: "14px",
                }}
            >
                {t("Loading...")}
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "100%", overflow: "hidden" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "12px",
                }}
            >
                <div>
                    <h1
                        style={{
                            fontFamily: "var(--font-heading)",
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            letterSpacing: "-1px",
                        }}
                    >
                        📋 {t("Task Board")}
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
                        {totalTasks > 0
                            ? `${totalTasks} ${t("tasks")} · ${doneTasks} ${t("done")}`
                            : t("No tasks yet")}
                    </p>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Filter by agent */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Filter style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
                        <select
                            value={filterAgent}
                            onChange={(e) => setFilterAgent(e.target.value)}
                            style={{
                                backgroundColor: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "6px",
                                padding: "6px 10px",
                                color: "var(--text-primary)",
                                fontSize: "12px",
                                cursor: "pointer",
                            }}
                        >
                            <option value="">{t("All Agents")}</option>
                            {agents.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.emoji} {a.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filter by priority */}
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            color: "var(--text-primary)",
                            fontSize: "12px",
                            cursor: "pointer",
                        }}
                    >
                        <option value="">{t("All Priorities")}</option>
                        <option value="urgent">{t("Urgent")}</option>
                        <option value="high">{t("High")}</option>
                        <option value="medium">{t("Medium")}</option>
                        <option value="low">{t("Low")}</option>
                    </select>

                    {/* New task button */}
                    <button
                        onClick={() => setModalState({ open: true, task: null })}
                        className="btn-primary"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                    >
                        <Plus style={{ width: "16px", height: "16px" }} />
                        {t("New Task")}
                    </button>
                </div>
            </div>

            {/* Board */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                    gap: "8px",
                    width: "100%",
                }}
            >
                {COLUMNS.map((col) => (
                    <TaskColumn
                        key={col.value}
                        status={col.value}
                        label={col.label}
                        emoji={col.emoji}
                        color={col.color}
                        tasks={tasksByStatus[col.value] || []}
                        agents={agents}
                        onEditTask={handleEditTask}
                        onDropTask={handleDropTask}
                        onQuickAdd={handleQuickAdd}
                        onDragStart={handleDragStart}
                    />
                ))}
            </div>

            {/* Modal */}
            {modalState.open && (
                <TaskModal
                    task={modalState.task}
                    defaultStatus={modalState.defaultStatus}
                    agents={agents}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    onClose={() => setModalState({ open: false, task: null })}
                />
            )}
        </div>
    );
}
