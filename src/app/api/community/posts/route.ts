// @ts-nocheck
// Community posts API with CRUD operations and moderation
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

// Input validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().min(1).max(50),
  isAnonymous: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z.string().optional(),
  search: z.string().optional(),
  authorId: z.string().optional(),
  isAnonymous: z.coerce.boolean().optional(),
  sortBy: z.enum(["recent", "popular", "discussed"]).optional().default("recent"),
});

// GET /api/community/posts - Get all posts with pagination and filtering
export async function GET(req: NextRequest) {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const params = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      category: searchParams.get("category"),
      search: searchParams.get("search"),
      authorId: searchParams.get("authorId"),
      isAnonymous: searchParams.get("isAnonymous"),
      sortBy: searchParams.get("sortBy"),
    });

    const skip = (params.page - 1) * params.limit;

    // Build where clause
    const where: any = {
      isModerated: false, // Don't show posts under moderation
    };

    if (params.category) {
      where.category = params.category;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { content: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.authorId) {
      where.authorId = params.authorId;
    }

    if (params.isAnonymous !== undefined) {
      where.isAnonymous = params.isAnonymous;
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (params.sortBy) {
      case "popular":
        orderBy = { likeCount: "desc" };
        break;
      case "discussed":
        orderBy = { viewCount: "desc" };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
    }

    // Get posts with author info
    const [posts, totalCount] = await Promise.all([
      prisma.communityPost.findMany({
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
              // Count related comments if we add a Comment model
            },
          },
        },
      }),
      prisma.communityPost.count({ where }),
    ]);

    // Process posts for anonymous authors
    const processedPosts = posts.map(post => {
      const { User, ...postData } = post;
      
      if (post.isAnonymous && User?.AnonymousIdentity) {
        return {
          ...postData,
          author: {
            displayName: User.AnonymousIdentity.displayName,
            avatar: User.AnonymousIdentity.avatar,
            isAnonymous: true,
          },
        };
      } else if (User) {
        return {
          ...postData,
          author: {
            id: User.id,
            displayName: User.displayName,
            avatar: User.avatarUrl,
            isAnonymous: false,
          },
        };
      } else {
        return {
          ...postData,
          author: {
            displayName: "Anonymous User",
            avatar: null,
            isAnonymous: true,
          },
        };
      }
    });

    return NextResponse.json({
      posts: processedPosts,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST /api/community/posts - Create a new post
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;

    // Check rate limiting
    if (!checkContentRateLimit(userId, 5)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before posting again." },
        { status: 429 }
      );
    }

    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = createPostSchema.parse(body);

    // Sanitize content
    const sanitizedTitle = sanitizeContent(validatedData.title);
    const sanitizedContent = sanitizeContent(validatedData.content);

    // Moderate content for safety
    const moderationResult = await moderateContent(
      `${sanitizedTitle} ${sanitizedContent}`,
      userId,
      "post"
    );

    // Handle crisis detection
    if (moderationResult.crisisDetected) {
      // Still allow the post but trigger interventions
      if (moderationResult.crisisLevel === "high") {
        // Create crisis alert
        await (prisma.safetyAlert as any).create({
        data: {
          id: crypto.randomUUID(),
            type: "crisis_post",
            severity: "high",
            userId,
            context: sanitizedTitle,
            indicators: moderationResult.reasons,
            handled: false,
            actions: moderationResult.suggestedActions,
          },
        });
      }
    }

    // Block spam and inappropriate content
    if (moderationResult.spamDetected || moderationResult.inappropriateContent) {
      // Update trust score negatively
      await updateTrustScore(userId, "negative", 0.2);

      return NextResponse.json(
        { 
          error: "Your post has been flagged for review.",
          reasons: moderationResult.reasons,
        },
        { status: 400 }
      );
    }

    // Create anonymous identity if needed
    let anonymousIdentity = null;
    if (validatedData.isAnonymous) {
      anonymousIdentity = await prisma.anonymousIdentity.findUnique({
        where: { userId },
      });

      if (!anonymousIdentity) {
        // Create anonymous identity
        const adjectives = ["Brave", "Hopeful", "Strong", "Caring", "Wise"];
        const nouns = ["Phoenix", "Lighthouse", "Guardian", "Explorer", "Dreamer"];
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

    // Create the post
    const post = await (prisma.communityPost as any).create({
        data: {
          id: crypto.randomUUID(),
        authorId: userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        category: validatedData.category,
        isAnonymous: validatedData.isAnonymous,
        isModerated: moderationResult.requiresReview,
        isPinned: false,
        viewCount: 0,
        likeCount: 0,
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

    // Update trust score positively for successful post
    if (!moderationResult.requiresReview) {
      await updateTrustScore(userId, "positive", 0.05);
    }

    // Process post for response
    const { User, ...postData } = post as any;
    const processedPost = validatedData.isAnonymous && User?.AnonymousIdentity
      ? {
          ...postData,
          author: {
            displayName: User.AnonymousIdentity.displayName,
            avatar: User.AnonymousIdentity.avatar,
            isAnonymous: true,
          },
        }
      : {
          ...postData,
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
        message: "Your post has been submitted for review and will be visible once approved.",
        post: processedPost,
        moderation: {
          status: "pending_review",
          reasons: moderationResult.reasons,
        },
      }, { status: 201 });
    }

    return NextResponse.json({
      message: "Post created successfully",
      post: processedPost,
      interventions: moderationResult.crisisDetected ? moderationResult.suggestedActions : [],
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
});

// PUT /api/community/posts - Update a post
export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if post exists and user is the author
    const existingPost = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existingPost.authorId !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own posts" },
        { status: 403 }
      );
    }

    // Parse and validate input
    const body = await (req as any).json();
    const validatedData = updatePostSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (validatedData.title) {
      updateData.title = sanitizeContent(validatedData.title);
    }

    if (validatedData.content) {
      updateData.content = sanitizeContent(validatedData.content);
    }

    if (validatedData.category) {
      updateData.category = validatedData.category;
    }

    // Moderate updated content
    if (validatedData.title || validatedData.content) {
      const contentToModerate = `${updateData.title || existingPost.title} ${updateData.content || existingPost.content}`;
      const moderationResult = await moderateContent(contentToModerate, userId, "post");

      if (moderationResult.spamDetected || moderationResult.inappropriateContent) {
        return NextResponse.json(
          { 
            error: "Your updates have been flagged for review.",
            reasons: moderationResult.reasons,
          },
          { status: 400 }
        );
      }

      updateData.isModerated = moderationResult.requiresReview;
    }

    // Update the post
    const updatedPost = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Post updated successfully",
      post: updatedPost,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
});

// DELETE /api/community/posts - Delete a post
export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if post exists
    const existingPost = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Check authorization - author or admin can delete
    const isAuthor = existingPost.authorId === userId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to delete this post" },
        { status: 403 }
      );
    }

    // Delete the post
    await prisma.communityPost.delete({
      where: { id: postId },
    });

    // Log moderation action if deleted by admin
    if (isAdmin && !isAuthor) {
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId,
          action: "delete_post",
          resource: "community_post",
          resourceId: postId,
          details: {
            reason: "Admin action",
            originalAuthor: existingPost.authorId,
          },
          outcome: "success",
        },
      });
    }

    return NextResponse.json({
      message: "Post deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
});