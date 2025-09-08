/**
 * Audit API Endpoint
 * Query audit logs and generate compliance reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditTrailService } from '@/lib/monitoring/audit-trail';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'query';

    // Authentication would be required here in production
    // const user = await authenticate(request);
    // if (!user || !user.hasRole('admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    switch (action) {
      case 'query':
        return await handleQuery(request, searchParams);
      case 'search':
        return await handleSearch(request, searchParams);
      case 'stats':
        return await handleStats(request, searchParams);
      case 'report':
        return await handleReport(request, searchParams);
      case 'export':
        return await handleExport(request, searchParams);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Audit API error:', error);

    // Log the error (but be careful not to create infinite loop)
    try {
      await auditTrailService.logEvent({
        eventType: 'api_access',
        action: 'audit_query_failed',
        outcome: 'failure',
        description: 'Failed to query audit logs',
        endpoint: '/api/monitoring/audit',
        method: 'GET',
        details: { error: (error as Error).message },
        logLevel: 'error',
      });
    } catch (logError) {
      console.error('Failed to log audit API error:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to process audit request' },
      { status: 500 }
    );
  }
}

/**
 * Handle audit log query
 */
async function handleQuery(request: NextRequest, searchParams: URLSearchParams) {
  const userId = searchParams.get('userId') || undefined;
  const eventType = searchParams.get('eventType') as any || undefined;
  const startTime = searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!) : undefined;
  const endTime = searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!) : undefined;
  const resourceId = searchParams.get('resourceId') || undefined;
  const containsPHI = searchParams.get('containsPHI') === 'true' ? true : 
                     searchParams.get('containsPHI') === 'false' ? false : undefined;
  const logLevel = searchParams.get('logLevel') as any || undefined;
  const outcome = searchParams.get('outcome') as any || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Log the query request
  await auditTrailService.logEvent({
    eventType: 'data_access',
    action: 'audit_logs_queried',
    outcome: 'success',
    description: 'Audit logs queried',
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    details: {
      filters: { userId, eventType, startTime, endTime, resourceId, containsPHI, logLevel, outcome },
      pagination: { limit, offset },
    },
    dataClassification: 'restricted',
    reasonForAccess: 'Audit log review',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const events = await auditTrailService.queryEvents({
    userId,
    eventType,
    startTime,
    endTime,
    resourceId,
    containsPHI,
    logLevel,
    outcome,
    limit,
    offset,
  });

  // Filter sensitive data for response
  const filteredEvents = events.map(event => ({
    id: event.id,
    timestamp: event.timestamp,
    eventType: event.eventType,
    logLevel: event.logLevel,
    action: event.action,
    outcome: event.outcome,
    description: event.description,
    source: event.resource,
    resource: event.resource,
    resourceType: event.resourceType,
    dataClassification: event.dataClassification,
    containsPHI: event.containsPHI,
    reasonForAccess: event.reasonForAccess,
    accessJustification: event.accessJustification,
    authenticationMethod: event.authenticationMethod,
    mfaUsed: event.mfaUsed,
    complianceRules: event.complianceRules,
    // Exclude sensitive fields like userId, patientId, detailed metadata
    hasEncryptedData: event.encrypted,
  }));

  return NextResponse.json({
    events: filteredEvents,
    pagination: {
      limit,
      offset,
      total: events.length,
      hasMore: events.length === limit, // Approximation
    },
  }, { status: 200 });
}

/**
 * Handle audit log search
 */
async function handleSearch(request: NextRequest, searchParams: URLSearchParams) {
  const query = searchParams.get('q') || '';
  const userId = searchParams.get('userId') || undefined;
  const eventTypes = searchParams.get('eventTypes')?.split(',') as any[] || undefined;
  const startTime = searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!) : undefined;
  const endTime = searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!) : undefined;
  const containsPHI = searchParams.get('containsPHI') === 'true' ? true : 
                     searchParams.get('containsPHI') === 'false' ? false : undefined;
  const severityLevel = searchParams.get('severityLevel') as any || undefined;
  const limit = parseInt(searchParams.get('limit') || '100');

  // Log the search request
  await auditTrailService.logEvent({
    eventType: 'data_access',
    action: 'audit_logs_searched',
    outcome: 'success',
    description: 'Audit logs searched',
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    details: {
      searchQuery: query,
      filters: { userId, eventTypes, startTime, endTime, containsPHI, severityLevel },
      limit,
    },
    dataClassification: 'restricted',
    reasonForAccess: 'Audit log investigation',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const events = await auditTrailService.searchLogs({
    query,
    userId,
    eventTypes,
    timeRange: startTime && endTime ? { start: startTime, end: endTime } : undefined,
    containsPHI,
    severityLevel,
    limit,
  });

  const filteredEvents = events.map(event => ({
    id: event.id,
    timestamp: event.timestamp,
    eventType: event.eventType,
    logLevel: event.logLevel,
    action: event.action,
    outcome: event.outcome,
    description: event.description,
    source: event.resource,
    resource: event.resource,
    dataClassification: event.dataClassification,
    containsPHI: event.containsPHI,
    hasEncryptedData: event.encrypted,
  }));

  return NextResponse.json({
    events: filteredEvents,
    query,
    resultCount: events.length,
  }, { status: 200 });
}

/**
 * Handle audit statistics
 */
async function handleStats(request: NextRequest, searchParams: URLSearchParams) {
  const startTime = searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!) : undefined;
  const endTime = searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!) : undefined;

  const timeRange = startTime && endTime ? { start: startTime, end: endTime } : undefined;

  // Log the stats request
  await auditTrailService.logEvent({
    eventType: 'data_access',
    action: 'audit_stats_requested',
    outcome: 'success',
    description: 'Audit statistics requested',
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    details: { timeRange },
    dataClassification: 'internal',
    reasonForAccess: 'System monitoring',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const stats = await auditTrailService.getStats(timeRange);

  return NextResponse.json({
    stats,
    timeRange,
    generatedAt: Date.now(),
  });
}

/**
 * Handle compliance report generation
 */
async function handleReport(request: NextRequest, searchParams: URLSearchParams) {
  const reportType = searchParams.get('type') as any || 'daily';
  const startTime = parseInt(searchParams.get('startTime') || String(Date.now() - 24 * 60 * 60 * 1000));
  const endTime = parseInt(searchParams.get('endTime') || String(Date.now()));

  // Log the report request
  await auditTrailService.logEvent({
    eventType: 'data_access',
    action: 'compliance_report_requested',
    outcome: 'success',
    description: `${reportType} compliance report requested`,
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    details: { reportType, period: { startTime, endTime } },
    dataClassification: 'restricted',
    reasonForAccess: 'Compliance reporting',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const report = await auditTrailService.generateComplianceReport(reportType, {
    startTime,
    endTime,
  });

  // Filter sensitive data from critical events
  const filteredReport = {
    ...report,
    criticalEvents: report.criticalEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      logLevel: event.logLevel,
      action: event.action,
      outcome: event.outcome,
      description: event.description,
      containsPHI: event.containsPHI,
    })),
    phiAccessEvents: report.phiAccessEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      action: event.action,
      outcome: event.outcome,
      reasonForAccess: event.reasonForAccess,
      accessJustification: event.accessJustification,
    })),
    securityEvents: report.securityEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      logLevel: event.logLevel,
      action: event.action,
      outcome: event.outcome,
      description: event.description,
    })),
    complianceViolations: report.complianceViolations.map(violation => ({
      eventId: violation.event.id,
      eventType: violation.event.eventType,
      timestamp: violation.event.timestamp,
      violation: violation.violation,
      severity: violation.severity,
    })),
  };

  return NextResponse.json(filteredReport, { status: 200 });
}

/**
 * Handle audit log export
 */
async function handleExport(request: NextRequest, searchParams: URLSearchParams) {
  const format = searchParams.get('format') as 'json' | 'csv' || 'json';
  const userId = searchParams.get('userId') || undefined;
  const eventType = searchParams.get('eventType') as any || undefined;
  const startTime = searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!) : undefined;
  const endTime = searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!) : undefined;
  const limit = parseInt(searchParams.get('limit') || '10000');

  // Log the export request
  await auditTrailService.logEvent({
    eventType: 'data_export',
    action: 'audit_logs_exported',
    outcome: 'success',
    description: `Audit logs exported in ${format} format`,
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    details: {
      format,
      filters: { userId, eventType, startTime, endTime },
      limit,
    },
    dataClassification: 'restricted',
    reasonForAccess: 'Data export for compliance',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const exportResult = await auditTrailService.exportLogs(
    {
      userId,
      eventType,
      startTime,
      endTime,
      limit,
    },
    format
  );

  const contentType = format === 'csv' ? 'text/csv' : 'application/json';

  return new NextResponse(exportResult.data, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'verify_integrity':
        return await handleVerifyIntegrity(request, body);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Audit POST API error:', error);
    return NextResponse.json(
      { error: 'Failed to process audit request' },
      { status: 500 }
    );
  }
}

/**
 * Handle integrity verification
 */
async function handleVerifyIntegrity(request: NextRequest, body: any) {
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json(
      { error: 'eventId is required' },
      { status: 400 }
    );
  }

  // Log the verification request
  await auditTrailService.logEvent({
    eventType: 'system_event',
    action: 'audit_integrity_verification',
    outcome: 'success',
    description: 'Audit log integrity verification requested',
    endpoint: '/api/monitoring/audit',
    method: 'POST',
    details: { eventId },
    dataClassification: 'internal',
    reasonForAccess: 'Integrity verification',
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  });

  const result = await auditTrailService.verifyIntegrity(eventId);

  return NextResponse.json({
    eventId,
    valid: result.valid,
    error: result.error,
    verifiedAt: Date.now(),
  });
}