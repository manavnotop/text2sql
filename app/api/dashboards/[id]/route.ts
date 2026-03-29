import { NextRequest, NextResponse } from 'next/server';
import { dashboards, Dashboard } from '../store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dashboard = dashboards.get(id);

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dashboard = dashboards.get(id);

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const body = await request.json();

    if (body.name !== undefined && typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
    }

    if (body.widgets && !Array.isArray(body.widgets)) {
      return NextResponse.json({ error: 'Widgets must be an array' }, { status: 400 });
    }

    const updatedDashboard: Dashboard = {
      ...dashboard,
      name: body.name ?? dashboard.name,
      widgets: body.widgets ?? dashboard.widgets,
      updatedAt: new Date().toISOString(),
    };

    dashboards.set(id, updatedDashboard);

    return NextResponse.json(updatedDashboard);
  } catch {
    return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!dashboards.has(id)) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    dashboards.delete(id);

    return NextResponse.json({ message: 'Dashboard deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 });
  }
}