import { NextRequest, NextResponse } from 'next/server';
import { dashboards } from './store';

export async function GET() {
  try {
    const allDashboards = Array.from(dashboards.values()).map((d) => ({
      id: d.id,
      name: d.name,
      widgets: d.widgets,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      shareId: d.shareId,
    }));
    return NextResponse.json(allDashboards);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const dashboard = {
      id: crypto.randomUUID(),
      name: body.name,
      widgets: body.widgets || [],
      createdAt: now,
      updatedAt: now,
      shareId: crypto.randomUUID(),
    };

    dashboards.set(dashboard.id, dashboard);

    return NextResponse.json(dashboard, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}