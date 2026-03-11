import { NextRequest, NextResponse } from 'next/server';
import {
    createTask,
    updateTask,
    deleteTask,
    getTasks,
    getTaskStats,
    reorderTasks,
    type TaskStatus,
    type TaskPriority,
} from '@/lib/tasks-db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const status = searchParams.get('status') as TaskStatus | null;
        const priority = searchParams.get('priority') as TaskPriority | null;
        const assigned_agent = searchParams.get('agent');
        const statsOnly = searchParams.get('stats') === 'true';

        if (statsOnly) {
            const stats = getTaskStats();
            return NextResponse.json({ stats });
        }

        const tasks = getTasks({
            status: status || undefined,
            priority: priority || undefined,
            assigned_agent: assigned_agent || undefined,
        });

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error('[tasks API] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const task = createTask({
            title: body.title.trim(),
            description: body.description?.trim() || undefined,
            status: body.status || 'backlog',
            priority: body.priority || 'medium',
            assigned_agent: body.assigned_agent || undefined,
            metadata: body.metadata || undefined,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (error) {
        console.error('[tasks API] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create task' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        // Reorder operation
        if (body.reorder && body.status && Array.isArray(body.taskIds)) {
            reorderTasks(body.status, body.taskIds);
            return NextResponse.json({ success: true });
        }

        // Single task update
        if (!body.id) {
            return NextResponse.json(
                { error: 'Task ID is required' },
                { status: 400 }
            );
        }

        const task = updateTask(body.id, {
            title: body.title,
            description: body.description,
            status: body.status,
            priority: body.priority,
            assigned_agent: body.assigned_agent,
            position: body.position,
            metadata: body.metadata,
        });

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ task });
    } catch (error) {
        console.error('[tasks API] PATCH error:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Task ID is required' },
                { status: 400 }
            );
        }

        const deleted = deleteTask(id);
        if (!deleted) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[tasks API] DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete task' },
            { status: 500 }
        );
    }
}
