import { NextRequest, NextResponse } from 'next/server';
import { dashboards } from '../../store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const { connectionId } = await params;

    for (const [, dashboard] of dashboards) {
      if (dashboard.id === connectionId) {
        return NextResponse.json({
          id: dashboard.id,
          name: dashboard.name,
          shareId: dashboard.shareId,
          widgets: dashboard.widgets,
          createdAt: dashboard.createdAt,
          updatedAt: dashboard.updatedAt,
        });
      }
    }

    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}