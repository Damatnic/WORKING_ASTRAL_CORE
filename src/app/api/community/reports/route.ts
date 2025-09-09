
// Content reporting API for community safety
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest, withRoles } from "@/lib/auth-middleware-exports";
import { UserRole } from "@/types/prisma";
import { z } from "zod";

// Add Report model to track reports
const reportSchema = z.object({
  contentType: z.enum(["post", "comment", "message", "user", "chatroom"]),
  contentId: z.string(),
  reason: z.enum([
    "spam",
    "harassment",
    "hate_speech",
    "violence",
    "self_harm",
    "inappropriate",
    "misinformation",
    "privacy_violation",
    "other"
  ]),
  description: z.string().min(10).max(1000),
  urgency: z.enum(["low", "medium", "high", "crisis"]).optional(),
  evidence: z.array(z.string()).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(["pending", "reviewing", "resolved", "dismissed"]).optional(),
  contentType: z.enum(["post", "comment", "message", "user", "chatroom"]).optional(),
  urgency: z.enum(["low", "medium", "high", "crisis"]).optional(),
});

// Store reports in memory (in production, add a Report model to Prisma)
interface Report {
  id: string;
  reporterId: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string;
  urgency: string;
  evidence: string[];
  status: string;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
}

// Temporary in-memory storage (replace with database)
const reports: Map<string, Report> = new Map();

// GET /api/community/reports - Get reports (moderators only)
export const GET = withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER, UserRole.THERAPIST],
  async (req: AuthenticatedRequest) => {
    try {
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const params = querySchema.parse({
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        status: searchParams.get("status"),
        contentType: searchParams.get("contentType"),
        urgency: searchParams.get("urgency"),
      });

      // Filter reports based on parameters
      let filteredReports = Array.from(reports.values());

      if (params.status) {
        filteredReports = filteredReports.filter(r => r.status === params.status);
      }

      if (params.contentType) {
        filteredReports = filteredReports.filter(r => r.contentType === params.contentType);
      }

      if (params.urgency) {
        filteredReports = filteredReports.filter(r => r.urgency === params.urgency);
      }

      // Sort by urgency and date
      const urgencyOrder = { crisis: 0, high: 1, medium: 2, low: 3 };
      filteredReports.sort((a, b) => {
        const urgencyDiff = urgencyOrder[a.urgency as keyof typeof urgencyOrder] - 
                           urgencyOrder[b.urgency as keyof typeof urgencyOrder];
        if (urgencyDiff !== 0) return urgencyDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Paginate
      const start = (params.page - 1) * params.limit;
      const paginatedReports = filteredReports.slice(start, start + params.limit);

      // Get content details for each report
      const enrichedReports = await Promise.all(
        paginatedReports.map(async (report) => {
          let content = null;
          let reporterInfo = null;

          // Get reporter info (anonymous)
          const reporter = await prisma.user.findUnique({
            where: { id: report.reporterId },
            select: {
              AnonymousIdentity: {
                select: {
                  displayName: true,
                  trustScore: true,
                },
              },
            },
          });

          reporterInfo = reporter?.AnonymousIdentity || { displayName: "Anonymous", trustScore: 0.5 };

          // Get content based on type
          switch (report.contentType) {
            case "post":
              content = await prisma.communityPost.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  title: true,
                  content: true,
                  authorId: true,
                  createdAt: true,
                },
              });
              break;

            case "comment":
              content = await prisma.comment.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  content: true,
                  authorId: true,
                  postId: true,
                  createdAt: true,
                },
              });
              break;

            case "user":
              const user = await prisma.user.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  AnonymousIdentity: {
                    select: {
                      displayName: true,
                      trustScore: true,
                    },
                  },
                },
              });
              content = user?.AnonymousIdentity || { displayName: "User" };
              break;
          }

          return {
            ...report,
            content,
            reporter: reporterInfo,
          };
        })
      );

      // Get statistics
      const stats = {
        total: filteredReports.length,
        pending: reports.size,
        crisis: Array.from(reports.values()).filter(r => r.urgency === "crisis").length,
        todayCount: Array.from(reports.values()).filter(r => {
          const today = new Date();
          return r.createdAt.toDateString() === today.toDateString();
        }).length,
      };

      return NextResponse.json({
        reports: enrichedReports,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: filteredReports.length,
          totalPages: Math.ceil(filteredReports.length / params.limit),
        },
        stats,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error fetching reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }
  }
);

// POST /api/community/reports - Create a new report
export const POST = withRoles([UserRole.USER, UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN], async (req: AuthenticatedRequest) => {
  try {
    const reporterId = req.user!.id;

    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = reportSchema.parse(body);

    // Check if content exists
    let contentExists = false;
    let contentAuthorId: string | null = null;

    switch (validatedData.contentType) {
      case "post":
        const post = await prisma.communityPost.findUnique({
          where: { id: validatedData.contentId },
        });
        contentExists = !!post;
        contentAuthorId = post?.authorId || null;
        break;

      case "comment":
        const comment = await prisma.comment.findUnique({
          where: { id: validatedData.contentId },
        });
        contentExists = !!comment;
        contentAuthorId = comment?.authorId || null;
        break;

      case "message":
        const message = await prisma.directMessage.findUnique({
          where: { id: validatedData.contentId },
        });
        contentExists = !!message;
        contentAuthorId = message?.senderId || null;
        break;

      case "user":
        const user = await prisma.user.findUnique({
          where: { id: validatedData.contentId },
        });
        contentExists = !!user;
        contentAuthorId = validatedData.contentId;
        break;

      case "chatroom":
        const room = await prisma.chatRoom.findUnique({
          where: { id: validatedData.contentId },
        });
        contentExists = !!room;
        break;
    }

    if (!contentExists) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Prevent self-reporting
    if (contentAuthorId === reporterId) {
      return NextResponse.json(
        { error: "Cannot report your own content" },
        { status: 400 }
      );
    }

    // Check for duplicate reports
    const existingReport = Array.from(reports.values()).find(
      r => r.reporterId === reporterId && 
          r.contentId === validatedData.contentId &&
          r.status === "pending"
    );

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this content" },
        { status: 409 }
      );
    }

    // Determine urgency based on reason if not provided
    let urgency = validatedData.urgency;
    if (!urgency) {
      if (["self_harm", "violence", "hate_speech"].includes(validatedData.reason)) {
        urgency = "high";
      } else if (["harassment", "privacy_violation"].includes(validatedData.reason)) {
        urgency = "medium";
      } else {
        urgency = "low";
      }
    }

    // Create report
    const report: Report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reporterId,
      contentType: validatedData.contentType,
      contentId: validatedData.contentId,
      reason: validatedData.reason,
      description: validatedData.description,
      urgency,
      evidence: validatedData.evidence || [],
      status: "pending",
      createdAt: new Date(),
    };

    reports.set(report.id, report);

    // Handle crisis/urgent reports
    if (urgency === "crisis" || validatedData.reason === "self_harm") {
      // Create safety alert
      await (prisma.safetyAlert as any).create({
        data: {
          id: crypto.randomUUID(),
          type: "user_report",
          severity: urgency,
          userId: contentAuthorId || reporterId,
          context: `${validatedData.contentType} reported for ${validatedData.reason}`,
          indicators: [validatedData.reason],
          handled: false,
          actions: ["Review content immediately", "Check user wellbeing"],
        },
      });

      // Notify crisis counselors
      const counselors = await prisma.user.findMany({
        where: {
          role: UserRole.CRISIS_COUNSELOR,
          isActive: true,
        },
        select: { id: true },
      });

      for (const counselor of counselors) {
        await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: counselor.id,
            type: "urgent_report",
            title: "Urgent Content Report",
            message: `A ${validatedData.contentType} has been reported for ${validatedData.reason}`,
            isPriority: true,
            metadata: {
              reportId: report.id,
              contentType: validatedData.contentType,
              reason: validatedData.reason,
            },
          },
        });
      }
    }

    // Notify moderators for high priority reports
    if (["high", "crisis"].includes(urgency)) {
      const moderators = await prisma.user.findMany({
        where: {
          OR: [
            { role: UserRole.ADMIN },
            { role: UserRole.HELPER },
            { role: UserRole.THERAPIST },
          ],
          isActive: true,
        },
        select: { id: true },
        take: 5, // Notify first 5 available moderators
      });

      for (const moderator of moderators) {
        await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: moderator.id,
            type: "content_report",
            title: "New Content Report",
            message: `${urgency.toUpperCase()} priority: ${validatedData.contentType} reported for ${validatedData.reason}`,
            isPriority: urgency === "crisis",
            metadata: {
              reportId: report.id,
            },
          },
        });
      }
    }

    // Auto-hide content for certain violations
    const autoHideReasons = ["hate_speech", "violence", "self_harm"];
    if (autoHideReasons.includes(validatedData.reason)) {
      switch (validatedData.contentType) {
        case "post":
          await prisma.communityPost.update({
            where: { id: validatedData.contentId },
            data: { isModerated: true },
          });
          break;

        case "comment":
          await prisma.comment.update({
            where: { id: validatedData.contentId },
            data: { isModerated: true },
          });
          break;
      }
    }

    // Log the report
    await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
        userId: reporterId,
        action: "create_report",
        resource: validatedData.contentType,
        resourceId: validatedData.contentId,
        details: {
          reason: validatedData.reason,
          urgency,
        },
        outcome: "success",
      },
    });

    return NextResponse.json({
      message: "Report submitted successfully",
      reportId: report.id,
      status: report.status,
      urgency,
      autoHidden: autoHideReasons.includes(validatedData.reason),
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
});

// PUT /api/community/reports - Update report status (moderators only)
export const PUT = withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR],
  async (req: AuthenticatedRequest) => {
    try {
      const moderatorId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
      const reportId = searchParams.get("id");

      if (!reportId) {
        return NextResponse.json(
          { error: "Report ID is required" },
          { status: 400 }
        );
      }

      const report = reports.get(reportId);
      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      const body = await (req as any).json();
      const { status, resolution } = z.object({
        status: z.enum(["reviewing", "resolved", "dismissed"]),
        resolution: z.string().optional(),
      }).parse(body);

      // Update report
      report.status = status;
      report.reviewedBy = moderatorId;
      report.reviewedAt = new Date();
      if (resolution) {
        report.resolution = resolution;
      }

      reports.set(reportId, report);

      // Notify reporter of resolution
      if (status === "resolved" || status === "dismissed") {
        await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: report.reporterId,
            type: "report_update",
            title: "Report Update",
            message: `Your report has been ${status}. ${resolution || ""}`,
            metadata: {
              reportId,
              status,
            },
          },
        });
      }

      return NextResponse.json({
        message: "Report updated successfully",
        report,
      }, { status: 200 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error updating report:", error);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 500 }
      );
    }
  }
);