import { NextRequest, NextResponse } from 'next/server';
import { dashboards } from '../../../store';

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

    return NextResponse.json({
      shareId: dashboard.shareId,
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        widgets: dashboard.widgets,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shared dashboard' }, { status: 500 });
  }
}