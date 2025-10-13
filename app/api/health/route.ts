import { NextResponse } from 'next/server';
import { performHealthCheck, getApplicationMetrics } from '@/lib/monitoring';

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  try {
    const health = await performHealthCheck();
    const metrics = getApplicationMetrics();

    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(
      {
        ...health,
        metrics
      },
      { status: statusCode }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
