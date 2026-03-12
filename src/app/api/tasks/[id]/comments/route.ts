import { NextRequest, NextResponse } from 'next/server';
import { getComments, createComment } from '@/lib/comments-db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const comments = getComments(id);
        return NextResponse.json({ comments });
    } catch (error) {
        console.error('[comments API] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.author || typeof body.author !== 'string' || !body.author.trim()) {
            return NextResponse.json(
                { error: 'Author is required' },
                { status: 400 }
            );
        }

        if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }

        const comment = createComment({
            task_id: id,
            author: body.author.trim(),
            content: body.content.trim(),
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        console.error('[comments API] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create comment' },
            { status: 500 }
        );
    }
}
