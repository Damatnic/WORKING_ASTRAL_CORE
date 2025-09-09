
// Community comments API with CRUD operations and moderation
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { 
  moderateContent, 
  sanitizeContent, 
  checkContentRateLimit,
  updateTrustScore 
} from "@/lib/community/moderation";
import { z } from "zod";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// Input validation schemas
const createCommentSchema = z.object({
  postId: z.string(),
  parentId: z.string().optional(),
  content: z.string().min(1).max(2000),
  isAnonymous: z.boolean().optional().default(true),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const querySchema = z.object({
  postId: z.string().optional(),
  parentId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["recent", "popular", "oldest"]).optional().default("recent"),
});

// GET /api/community/comments - Get comments for a post or replies to a comment
export async function GET(req: NextRequest) {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const params = querySchema.parse({
      postId: searchParams.get("postId"),
      parentId: searchParams.get("parentId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
    });

    if (!params.postId && !params.parentId) {
      return NextResponse.json(
        { error: "Either postId or parentId is required" },
        { status: 400 }
      );
    }

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {
      isDeleted: false,
      isModerated: false,
    };

    if (params.postId) {
      where.postId = params.postId;
      where.parentId = null; // Get top-level comments only
    } else if (params.parentId) {
      where.parentId = params.parentId; // Get replies to a specific comment
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (params.sortBy) {
      case "popular":
        orderBy = { likeCount: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
    }

    // Get comments with author info and reply count
    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: params.limit,
        orderBy,
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              AnonymousIdentity: {
                select: {
                  displayName: true,
                  avatar: true,
                  colorTheme: true,
                },
              },
            },
          },
          _count: {
            select: {
              Replies: {
                where: {
                  isDeleted: false,
                  isModerated: false,
                },
              },
            },
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    // Process comments for anonymous authors
    const processedComments = comments.map(comment => {
      const { User, _count, ...commentData } = comment;
      
      const processedComment: any = {
        ...commentData,
        replyCount: _count.Replies,
      };

      if (comment.isAnonymous && User?.AnonymousIdentity) {
        processedComment.author = {
          displayName: User.AnonymousIdentity.displayName,
          avatar: User.AnonymousIdentity.avatar,
          isAnonymous: true,
        };
      } else if (User) {
        processedComment.author = {
          id: User.id,
          displayName: User.displayName,
          avatar: User.avatarUrl,
          isAnonymous: false,
        };
      } else {
        processedComment.author = {
          displayName: "Anonymous User",
          avatar: null,
          isAnonymous: true,
        };
      }

      return processedComment;
    });

    return NextResponse.json({
      comments: processedComments,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/community/comments - Create a new comment
export async function POST(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;

      // Check rate limiting
      if (!checkContentRateLimit(userId, 10)) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait before commenting again." },
          { status: 429 }
        );
      }

      // Parse and validate input
      const body = await (req as any).json();
      const validatedData = createCommentSchema.parse(body);

      // Verify post exists
      const post = await prisma.communityPost.findUnique({
        where: { id: validatedData.postId },
      });

      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }

      // If replying to a comment, verify parent exists
      if (validatedData.parentId) {
        const parentComment = await prisma.comment.findUnique({
          where: { id: validatedData.parentId },
        });

        if (!parentComment || parentComment.postId !== validatedData.postId) {
          return NextResponse.json(
            { error: "Parent comment not found or doesn't belong to this post" },
            { status: 404 }
          );
        }
      }

      // Sanitize content
      const sanitizedContent = sanitizeContent(validatedData.content);

      // Moderate content for safety
      const moderationResult = await moderateContent(
        sanitizedContent,
        userId,
        "comment"
      );

      // Handle crisis detection
      if (moderationResult.crisisDetected && moderationResult.crisisLevel === "high") {
        // Create crisis alert
        await (prisma.safetyAlert as any).create({
          data: {
            id: crypto.randomUUID(),
            type: "crisis_comment",
            severity: "high",
            userId,
            context: `Comment on post: ${post.title}`,
            indicators: moderationResult.reasons,
            handled: false,
            actions: moderationResult.suggestedActions,
          },
        });
      }

      // Block spam and inappropriate content
      if (moderationResult.spamDetected || moderationResult.inappropriateContent) {
        await updateTrustScore(userId, "negative", 0.1);

        return NextResponse.json(
          { 
            error: "Your comment has been flagged for review.",
            reasons: moderationResult.reasons,
          },
          { status: 400 }
        );
      }

      // Create or get anonymous identity if needed
      if (validatedData.isAnonymous) {
        let anonymousIdentity = await prisma.anonymousIdentity.findUnique({
          where: { userId },
        });

        if (!anonymousIdentity) {
          const adjectives = ["Kind", "Supportive", "Thoughtful", "Gentle", "Understanding"];
          const nouns = ["Friend", "Listener", "Helper", "Companion", "Soul"];
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
          const randomNumber = Math.floor(Math.random() * 1000);

          anonymousIdentity = await (prisma.anonymousIdentity as any).create({
            data: {
              id: crypto.randomUUID(),
              userId,
              displayName: `${randomAdjective}${randomNoun}${randomNumber}`,
              avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${userId}`,
              colorTheme: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
              trustScore: 0.5,
              badges: [],
              languages: ["en"],
              updatedAt: new Date(),
            },
          });
        }
      }

      // Create the comment
      const comment = await (prisma.comment as any).create({
        data: {
          id: crypto.randomUUID(),
          postId: validatedData.postId,
          parentId: validatedData.parentId,
          authorId: userId,
          content: sanitizedContent,
          isAnonymous: validatedData.isAnonymous,
          isModerated: moderationResult.requiresReview,
          likeCount: 0,
          isDeleted: false,
          updatedAt: new Date(),
        },
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              AnonymousIdentity: {
                select: {
                  displayName: true,
                  avatar: true,
                  colorTheme: true,
                },
              },
            },
          },
        },
      });

      // Update trust score positively for successful comment
      if (!moderationResult.requiresReview) {
        await updateTrustScore(userId, "positive", 0.02);
      }

      // Process comment for response
      const { User, ...commentData } = comment as any;
      const processedComment = validatedData.isAnonymous && User?.AnonymousIdentity
        ? {
            ...commentData,
            author: {
              displayName: User.AnonymousIdentity.displayName,
              avatar: User.AnonymousIdentity.avatar,
              isAnonymous: true,
            },
          }
        : {
            ...commentData,
            author: {
              id: User?.id,
              displayName: User?.displayName,
              avatar: User?.avatarUrl,
              isAnonymous: false,
            },
          };

      // Send response based on moderation status
      if (moderationResult.requiresReview) {
        return NextResponse.json({
          message: "Your comment has been submitted for review.",
          comment: processedComment,
          moderation: {
            status: "pending_review",
            reasons: moderationResult.reasons,
          },
        }, { status: 201 });
      }

      return NextResponse.json({
        message: "Comment created successfully",
        comment: processedComment,
        interventions: moderationResult.crisisDetected ? moderationResult.suggestedActions : [],
      }, { status: 201 });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Error creating comment:", error);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }
  });
}

// PUT /api/community/comments - Update a comment
export async function PUT(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const commentId = searchParams.get("id");

      if (!commentId) {
        return NextResponse.json(
          { error: "Comment ID is required" },
          { status: 400 }
        );
      }

      // Check if comment exists and user is the author
      const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        );
      }

      if (existingComment.isDeleted) {
        return NextResponse.json(
          { error: "Cannot edit deleted comment" },
          { status: 400 }
        );
      }

      if (existingComment.authorId !== userId) {
        return NextResponse.json(
          { error: "You can only edit your own comments" },
          { status: 403 }
        );
      }

      // Parse and validate input
      const body = await (req as any).json();
      const validatedData = updateCommentSchema.parse(body);

      // Sanitize and moderate content
      const sanitizedContent = sanitizeContent(validatedData.content);
      const moderationResult = await moderateContent(sanitizedContent, userId, "comment");

      if (moderationResult.spamDetected || moderationResult.inappropriateContent) {
        return NextResponse.json(
          { 
            error: "Your updates have been flagged for review.",
            reasons: moderationResult.reasons,
          },
          { status: 400 }
        );
      }

      // Update the comment
      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: {
          content: sanitizedContent,
          isModerated: moderationResult.requiresReview,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: "Comment updated successfully",
        comment: updatedComment,
      });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
  });
}

// DELETE /api/community/comments - Delete a comment (soft delete)
export async function DELETE(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const url = (req as any).url || req.nextUrl?.toString();
      const { searchParams } = new URL(url);
      const commentId = searchParams.get("id");

      if (!commentId) {
        return NextResponse.json(
          { error: "Comment ID is required" },
          { status: 400 }
        );
      }

      // Check if comment exists
      const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          _count: {
            select: { Replies: true },
          },
        },
      });

      if (!existingComment) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        );
      }

      // Check authorization
      const isAuthor = existingComment.authorId === userId;
      const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

      if (!isAuthor && !isAdmin) {
        return NextResponse.json(
          { error: "You don't have permission to delete this comment" },
          { status: 403 }
        );
      }

      // Soft delete the comment (preserve for replies)
      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          content: "[This comment has been deleted]",
          updatedAt: new Date(),
        },
      });

      // Log moderation action if deleted by admin
      if (isAdmin && !isAuthor) {
        await (prisma.auditLog as any).create({
          data: {
            id: crypto.randomUUID(),
            userId,
            action: "delete_comment",
            resource: "comment",
            resourceId: commentId,
            details: {
              reason: "Admin action",
              originalAuthor: existingComment.authorId,
              hasReplies: existingComment._count.Replies > 0,
            },
            outcome: "success",
          },
        });
      }

      return NextResponse.json({
        message: "Comment deleted successfully",
        preservedForReplies: existingComment._count.Replies > 0,
      });

  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
  });
}