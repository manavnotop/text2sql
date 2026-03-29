import { NextRequest, NextResponse } from 'next/server';
import { dashboards } from '../../store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;

    for (const [, dashboard] of dashboards) {
      if (dashboard.shareId === shareId) {
        return NextResponse.json({
          id: dashboard.id,
          name: dashboard.name,
          widgets: dashboard.widgets,
          createdAt: dashboard.createdAt,
          updatedAt: dashboard.updatedAt,
          shareId: dashboard.shareId,
        });
      }
    }

    return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shared dashboard' }, { status: 500 });
  }
}