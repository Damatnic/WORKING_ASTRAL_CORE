
// Community moderation API with safety features and crisis intervention
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest, withRoles } from '@/lib/auth-middleware-exports';
import { UserRole } from "@/types/prisma";
import { 
  moderateContent, 
  isUserRestricted,
  updateTrustScore 
} from "@/lib/community/moderation";
import { z } from "zod";

// Input validation schemas
const moderationActionSchema = z.object({
  type: z.enum(["warn", "mute", "ban", "suspend", "restrict", "approve", "reject"]),
  targetUserId: z.string(),
  reason: z.string().min(1).max(500),
  evidence: z.array(z.string()).optional().default([]),
  duration: z.number().int().positive().optional(), // Duration in hours
  appealable: z.boolean().optional().default(true),
  contentId: z.string().optional(), // ID of the content being moderated
  contentType: z.enum(["post", "comment", "message", "profile"]).optional(),
});

const reviewContentSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(["post", "comment", "message"]),
  action: z.enum(["approve", "reject", "edit"]),
  editedContent: z.string().optional(),
  reason: z.string().optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(["pending", "resolved", "appeals", "crisis"]).optional().default("pending"),
  userId: z.string().optional(),
  moderatorId: z.string().optional(),
});

// GET /api/community/moderation - Get moderation queue and actions
export async function GET(req: NextRequest) {
  return withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER, UserRole.THERAPIST],
  async (req: AuthenticatedRequest) => {
    try {
      const moderatorId = req.user!.id;
      const moderatorRole = req.user!.role;
      const url = (req as any).url || req.nextUrl?.toString()(req);
}
    const { searchParams } = new URL(url);
      const params = querySchema.parse({
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        type: searchParams.get("type"),
        userId: searchParams.get("userId"),
        moderatorId: searchParams.get("moderatorId"),
      });

      const skip = (params.page - 1) * params.limit;

      if (params.type === "pending") {
        // Get content pending moderation
        const [posts, comments, safetyAlerts] = await Promise.all([
          // Moderated posts
          prisma.communityPost.findMany({
            where: { isModerated: true },
            skip,
            take: params.limit,
            orderBy: { createdAt: "desc" },
            include: {
              User: {
                select: {
                  id: true,
                  displayName: true,
                  AnonymousIdentity: {
                    select: { displayName: true },
                  },
                },
              },
            },
          }),
          // Moderated comments
          prisma.comment.findMany({
            where: { isModerated: true },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              User: {
                select: {
                  id: true,
                  displayName: true,
                  AnonymousIdentity: {
                    select: { displayName: true },
                  },
                },
              },
            },
          }),
          // Unhandled safety alerts
          prisma.safetyAlert.findMany({
            where: { 
              handled: false,
              severity: { in: ["high", "critical"] },
            },
            take: 5,
            orderBy: { detectedAt: "desc" },
          }),
        ]);

        return NextResponse.json({
          pendingModeration: {
            posts,
            comments,
            safetyAlerts,
          },
          counts: {
            posts: posts.length,
            comments: comments.length,
            alerts: safetyAlerts.length,
          },
        }, { status: 200 });

      } else if (params.type === "resolved") {
        // Get recent moderation actions
        const where: any = {};
        
        if (params.userId) {
          where.targetUserId = params.userId;
        }
        
        if (params.moderatorId && moderatorRole === UserRole.SUPER_ADMIN) {
          where.moderatorId = params.moderatorId;
        } else if (moderatorRole !== UserRole.SUPER_ADMIN) {
          where.moderatorId = moderatorId; // Non-admins can only see their own actions
        }

        const actions = await prisma.moderationAction.findMany({
          where,
          skip,
          take: params.limit,
          orderBy: { createdAt: "desc" },
          include: {
            AnonymousIdentity_ModerationAction_targetUserIdToAnonymousIdentity: {
              select: {
                displayName: true,
                userId: true,
              },
            },
            AnonymousIdentity_ModerationAction_moderatorIdToAnonymousIdentity: {
              select: {
                displayName: true,
              },
            },
          },
        });

        const totalCount = await prisma.moderationAction.count({ where });

        return NextResponse.json({
          actions,
          pagination: {
            page: params.page,
            limit: params.limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / params.limit),
          },
        });

      } else if (params.type === "appeals") {
        // Get appealed moderation actions
        const appeals = await prisma.moderationAction.findMany({
          where: {
            appealed: true,
            appealable: true,
          },
          skip,
          take: params.limit,
          orderBy: { createdAt: "desc" },
          include: {
            AnonymousIdentity_ModerationAction_targetUserIdToAnonymousIdentity: {
              select: {
                displayName: true,
                userId: true,
              },
            },
          },
        });

        return NextResponse.json({
          appeals,
          count: appeals.length,
        }, { status: 200 });

      } else if (params.type === "crisis") {
        // Get crisis-related content and alerts
        const [crisisReports, safetyAlerts] = await Promise.all([
          prisma.crisisReport.findMany({
            where: { resolved: false },
            skip,
            take: params.limit,
            orderBy: { createdAt: "desc" },
            include: {
              User: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          }),
          prisma.safetyAlert.findMany({
            where: {
              handled: false,
              type: { in: ["crisis_content", "crisis_post", "crisis_message", "crisis_comment"] },
            },
            take: params.limit,
            orderBy: { detectedAt: "desc" },
          }),
        ]);

        return NextResponse.json({
          crisisReports,
          safetyAlerts,
          requiresImmediate: crisisReports.filter(r => r.severityLevel >= 8).length,
        });
      }

      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error fetching moderation queue:", error);
      return NextResponse.json(
        { error: "Failed to fetch moderation queue" },
        { status: 500 }
      );
    }
  }
);

// POST /api/community/moderation - Create moderation action
export async function POST(req: NextRequest) {
  return withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR],
  async (req: AuthenticatedRequest) => {
    try {
      const moderatorId = req.user!.id;
      const moderatorRole = req.user!.role;

      // Parse and validate input
      const body = await (req as any).json()(req);
}
      const validatedData = moderationActionSchema.parse(body);

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: validatedData.targetUserId },
        include: {
          AnonymousIdentity: true,
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }

      // Check permissions based on action type
      const restrictiveActions = ["ban", "suspend"];
      if (restrictiveActions.includes(validatedData.type) && 
          !["ADMIN", "SUPER_ADMIN"].includes(moderatorRole)) {
        return NextResponse.json(
          { error: "Insufficient permissions for this action" },
          { status: 403 }
        );
      }

      // Prevent self-moderation
      if (validatedData.targetUserId === moderatorId) {
        return NextResponse.json(
          { error: "Cannot moderate yourself" },
          { status: 400 }
        );
      }

      // Get or create anonymous identities for moderation
      let moderatorAnonymousId = await prisma.anonymousIdentity.findUnique({
        where: { userId: moderatorId },
      });

      if (!moderatorAnonymousId) {
        moderatorAnonymousId = await (prisma.anonymousIdentity as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: moderatorId,
            displayName: `Moderator${Math.floor(Math.random() * 10000)}`,
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=mod${moderatorId}`,
            colorTheme: "hsl(200, 70%, 50%)",
            trustScore: 1.0,
            badges: ["moderator"],
            languages: ["en"],
            updatedAt: new Date(),
          },
        });
      }

      let targetAnonymousId = targetUser.AnonymousIdentity;
      if (!targetAnonymousId) {
        targetAnonymousId = await (prisma.anonymousIdentity as any).create({
        data: {
          id: crypto.randomUUID(),
            userId: validatedData.targetUserId,
            displayName: `User${Math.floor(Math.random() * 100000)}`,
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${validatedData.targetUserId}`,
            colorTheme: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
            trustScore: 0.5,
            badges: [],
            languages: ["en"],
            updatedAt: new Date(),
          },
        });
      }

      // Calculate expiration for temporary actions
      let expiresAt = null;
      if (validatedData.duration) {
        expiresAt = new Date(Date.now() + validatedData.duration * 60 * 60 * 1000);
      }

      // Create moderation action
      const action = await (prisma.moderationAction as any).create({
        data: {
          id: crypto.randomUUID(),
          type: validatedData.type,
          targetUserId: targetAnonymousId!.id,
          moderatorId: moderatorAnonymousId!.id,
          reason: validatedData.reason,
          evidence: validatedData.evidence,
          duration: validatedData.duration,
          expiresAt,
          appealable: validatedData.appealable,
        },
      });

      // Apply the moderation action
      switch (validatedData.type) {
        case "ban":
          await prisma.user.update({
            where: { id: validatedData.targetUserId },
            data: { isActive: false },
          });
          break;

        case "suspend":
          await prisma.user.update({
            where: { id: validatedData.targetUserId },
            data: {
              lockedUntil: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
            },
          });
          break;

        case "restrict":
          // Update trust score for restrictions
          await updateTrustScore(validatedData.targetUserId, "negative", 0.3);
          break;

        case "warn":
          // Send warning notification
          await (prisma.notification as any).create({
        data: {
          id: crypto.randomUUID(),
              userId: validatedData.targetUserId,
              type: "moderation_warning",
              title: "Community Guidelines Warning",
              message: validatedData.reason,
              isPriority: true,
              metadata: {
                actionId: action.id,
                appealable: validatedData.appealable,
              },
            },
          });
          break;
      }

      // Handle content-specific actions
      if (validatedData.contentId && validatedData.contentType) {
        switch (validatedData.contentType) {
          case "post":
            await prisma.communityPost.update({
              where: { id: validatedData.contentId },
              data: { isModerated: false },
            });
            break;

          case "comment":
            await prisma.comment.update({
              where: { id: validatedData.contentId },
              data: { isDeleted: true },
            });
            break;
        }
      }

      // Log the moderation action
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: moderatorId,
          action: `moderation_${validatedData.type}`,
          resource: "user",
          resourceId: validatedData.targetUserId,
          details: {
            reason: validatedData.reason,
            duration: validatedData.duration,
            contentId: validatedData.contentId,
          },
          outcome: "success",
        },
      });

      return NextResponse.json({
        message: "Moderation action applied successfully",
        action,
      }, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error creating moderation action:", error);
      return NextResponse.json(
        { error: "Failed to create moderation action" },
        { status: 500 }
      );
    }
  }
);

// PUT /api/community/moderation - Review and update moderated content
export async function PUT(req: NextRequest) {
  return withRoles(
  [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HELPER, UserRole.THERAPIST],
  async (req: AuthenticatedRequest) => {
    try {
      const moderatorId = req.user!.id;
      
      // Parse and validate input
      const body = await (req as any).json()(req);
}
      const validatedData = reviewContentSchema.parse(body);

      let result: any = {};

      switch (validatedData.contentType) {
        case "post":
          const post = await prisma.communityPost.findUnique({
            where: { id: validatedData.contentId },
          });

          if (!post) {
            return NextResponse.json(
              { error: "Post not found" },
              { status: 404 }
            );
          }

          if (validatedData.action === "approve") {
            result = await prisma.communityPost.update({
              where: { id: validatedData.contentId },
              data: { isModerated: false },
            });

            // Update trust score positively
            if (post.authorId) {
              await updateTrustScore(post.authorId, "positive", 0.1);
            }

          } else if (validatedData.action === "reject") {
            result = await prisma.communityPost.delete({
              where: { id: validatedData.contentId },
            });

            // Update trust score negatively
            if (post.authorId) {
              await updateTrustScore(post.authorId, "negative", 0.2);
            }

          } else if (validatedData.action === "edit" && validatedData.editedContent) {
            result = await prisma.communityPost.update({
              where: { id: validatedData.contentId },
              data: {
                content: validatedData.editedContent,
                isModerated: false,
              },
            });
          }
          break;

        case "comment":
          const comment = await prisma.comment.findUnique({
            where: { id: validatedData.contentId },
          });

          if (!comment) {
            return NextResponse.json(
              { error: "Comment not found" },
              { status: 404 }
            );
          }

          if (validatedData.action === "approve") {
            result = await prisma.comment.update({
              where: { id: validatedData.contentId },
              data: { isModerated: false },
            });

            if (comment.authorId) {
              await updateTrustScore(comment.authorId, "positive", 0.05);
            }

          } else if (validatedData.action === "reject") {
            result = await prisma.comment.update({
              where: { id: validatedData.contentId },
              data: {
                isDeleted: true,
                content: "[This comment has been removed by moderators]",
              },
            });

            if (comment.authorId) {
              await updateTrustScore(comment.authorId, "negative", 0.1);
            }

          } else if (validatedData.action === "edit" && validatedData.editedContent) {
            result = await prisma.comment.update({
              where: { id: validatedData.contentId },
              data: {
                content: validatedData.editedContent,
                isModerated: false,
              },
            });
          }
          break;
      }

      // Log the review action
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: moderatorId,
          action: `review_${validatedData.action}`,
          resource: validatedData.contentType,
          resourceId: validatedData.contentId,
          details: {
            reason: validatedData.reason,
            edited: validatedData.action === "edit",
          },
          outcome: "success",
        },
      });

      return NextResponse.json({
        message: `Content ${validatedData.action}ed successfully`,
        result,
      }, { status: 200 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error reviewing content:", error);
      return NextResponse.json(
        { error: "Failed to review content" },
        { status: 500 }
      );
    }
  }
);