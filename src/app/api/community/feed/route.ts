
// Personalized community feed API with recommendations and filtering
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { z } from "zod";

// Input validation schema
const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  type: z.enum(["personalized", "trending", "recent", "following"]).optional().default("personalized"),
  categories: z.string().optional(), // Comma-separated categories
  timeframe: z.enum(["today", "week", "month", "all"]).optional().default("week"),
});

// Calculate content score for ranking
function calculateContentScore(
  post: any,
  userPreferences: any,
  timeDecayFactor: number = 0.95
): number {
  const now = Date.now();
  const postAge = now - new Date(post.createdAt).getTime();
  const hoursSincePost = postAge / (1000 * 60 * 60);
  
  // Base score from engagement
  let score = post.likeCount * 2 + post.viewCount * 0.1 + (post._count?.Comments || 0) * 3;
  
  // Time decay
  score *= Math.pow(timeDecayFactor, hoursSincePost / 24);
  
  // Category match bonus
  if (userPreferences?.interestedTopics?.includes(post.category)) {
    score *= 1.5;
  }
  
  // Pinned posts get a boost
  if (post.isPinned) {
    score *= 2;
  }
  
  // Crisis or support posts get priority
  if (["crisis", "support", "help"].includes(post.category.toLowerCase())) {
    score *= 1.3;
  }
  
  return score;
}

// GET /api/community/feed - Get personalized community feed
export async function GET(req: NextRequest) {
  return withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.id;
    const url = (req as any).url || req.nextUrl?.toString()(req);
}
    const { searchParams } = new URL(url);
    const params = feedQuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      type: searchParams.get("type"),
      categories: searchParams.get("categories"),
      timeframe: searchParams.get("timeframe"),
    });

    const skip = (params.page - 1) * params.limit;
    
    // Get user preferences for personalization
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        interestedTopics: true,
        mentalHealthGoals: true,
      },
    });

    // Get user's anonymous identity for engagement tracking
    const anonymousIdentity = await prisma.anonymousIdentity.findUnique({
      where: { userId },
      select: {
        id: true,
        trustScore: true,
      },
    });

    // Build base where clause
    const baseWhere: any = {
      isModerated: false, // Don't show moderated content
    };

    // Apply category filter
    if (params.categories) {
      const categoryList = params.categories.split(",").map(c => c.trim());
      baseWhere.category = { in: categoryList };
    } else if (userProfile?.interestedTopics && userProfile.interestedTopics.length > 0) {
      // Use user's interested topics if no specific categories requested
      baseWhere.category = { in: userProfile.interestedTopics };
    }

    // Apply timeframe filter
    if (params.timeframe !== "all") {
      const timeframeMap = {
        today: 24,
        week: 24 * 7,
        month: 24 * 30,
      };
      const hoursAgo = timeframeMap[params.timeframe as keyof typeof timeframeMap];
      baseWhere.createdAt = {
        gte: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      };
    }

    let posts: any[] = [];
    let totalCount = 0;

    switch (params.type) {
      case "personalized":
        // Get posts with engagement metrics
        const allPosts = await prisma.communityPost.findMany({
          where: baseWhere,
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
                Comments: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        });

        // Score and sort posts
        const scoredPosts = allPosts.map(post => ({
          ...post,
          score: calculateContentScore(post, userProfile),
        }));

        scoredPosts.sort((a, b) => b.score - a.score);
        
        // Paginate scored results
        posts = scoredPosts.slice(skip, skip + params.limit);
        totalCount = scoredPosts.length;
        break;

      case "trending":
        // Get trending posts (high engagement in recent timeframe)
        posts = await prisma.communityPost.findMany({
          where: {
            ...baseWhere,
            createdAt: {
              gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
            },
          },
          orderBy: [
            { likeCount: "desc" },
            { viewCount: "desc" },
          ],
          skip,
          take: params.limit,
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
                Comments: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        });

        totalCount = await prisma.communityPost.count({
          where: {
            ...baseWhere,
            createdAt: {
              gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
            },
          },
        });
        break;

      case "recent":
        // Get most recent posts
        posts = await prisma.communityPost.findMany({
          where: baseWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take: params.limit,
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
                Comments: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        });

        totalCount = await prisma.communityPost.count({ where: baseWhere });
        break;

      case "following":
        // Get posts from followed users/topics (placeholder - needs following system)
        // For now, return posts from users with high trust scores
        const trustedUsers = await prisma.anonymousIdentity.findMany({
          where: {
            trustScore: { gte: 0.7 },
          },
          select: { userId: true },
        });

        const trustedUserIds = trustedUsers.map(u => u.userId);

        posts = await prisma.communityPost.findMany({
          where: {
            ...baseWhere,
            authorId: { in: trustedUserIds },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: params.limit,
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
                Comments: {
                  where: { isDeleted: false },
                },
              },
            },
          },
        });

        totalCount = await prisma.communityPost.count({
          where: {
            ...baseWhere,
            authorId: { in: trustedUserIds },
          },
        });
        break;
    }

    // Process posts for anonymous authors
    const processedPosts = posts.map(post => {
      const { User, _count, score, ...postData } = post;
      
      const processedPost: any = {
        ...postData,
        commentCount: _count?.Comments || 0,
        score: score || 0,
      };

      if (post.isAnonymous && User?.AnonymousIdentity) {
        processedPost.author = {
          displayName: User.AnonymousIdentity.displayName,
          avatar: User.AnonymousIdentity.avatar,
          isAnonymous: true,
        };
      } else if (User) {
        processedPost.author = {
          id: User.id,
          displayName: User.displayName,
          avatar: User.avatarUrl,
          isAnonymous: false,
        };
      } else {
        processedPost.author = {
          displayName: "Anonymous User",
          avatar: null,
          isAnonymous: true,
        };
      }

      return processedPost;
    });

    // Get related content suggestions
    const suggestions = await getContentSuggestions(userId, userProfile);

    // Get active chat rooms related to user interests
    const recommendedRooms = await prisma.chatRoom.findMany({
      where: {
        isActive: true,
        topic: {
          in: userProfile?.interestedTopics || [],
        },
      },
      take: 5,
      orderBy: { lastActivity: "desc" },
      select: {
        id: true,
        name: true,
        topic: true,
        description: true,
        _count: {
          select: {
            ChatParticipant: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Get trending topics
    const trendingTopics = await prisma.communityPost.groupBy({
      by: ["category"],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        isModerated: false,
      },
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: "desc",
        },
      },
      take: 10,
    });

    return NextResponse.json({
      posts: processedPosts,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / params.limit),
      },
      suggestions,
      recommendedRooms: recommendedRooms.map(room => ({
        ...room,
        participantCount: room._count.ChatParticipant,
      })),
      trendingTopics: trendingTopics.map(t => ({
        category: t.category,
        count: t._count.category,
      })),
      feedType: params.type,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error fetching feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
});

// Helper function to get content suggestions
async function getContentSuggestions(userId: string, userProfile: any) {
  const suggestions: any = {
    resources: [],
    activities: [],
    groups: [],
  };

  // Suggest resources based on mental health goals
  if (userProfile?.mentalHealthGoals && userProfile.mentalHealthGoals.length > 0) {
    const resourceMap: Record<string, string[]> = {
      anxiety: [
        "Breathing exercises for anxiety relief",
        "Grounding techniques guide",
        "Progressive muscle relaxation",
      ],
      depression: [
        "Daily mood tracking templates",
        "Behavioral activation worksheets",
        "Gratitude journaling prompts",
      ],
      stress: [
        "Stress management techniques",
        "Time management strategies",
        "Mindfulness meditation guides",
      ],
      sleep: [
        "Sleep hygiene checklist",
        "Bedtime routine builder",
        "Sleep tracking tools",
      ],
      relationships: [
        "Communication skills workshops",
        "Boundary setting guides",
        "Conflict resolution strategies",
      ],
    };

    userProfile.mentalHealthGoals.forEach((goal: string) => {
      const resources = resourceMap[goal.toLowerCase()] || [];
      suggestions.resources.push(...resources);
    });
  }

  // Suggest activities based on recent engagement
  const recentPosts = await prisma.communityPost.findMany({
    where: {
      authorId: userId,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { category: true },
  });

  const categories = [...new Set(recentPosts.map(p => p.category))];
  
  const activityMap: Record<string, string[]> = {
    anxiety: ["Join anxiety support group", "Try today's breathing exercise"],
    depression: ["Participate in peer support chat", "Complete mood check-in"],
    wellness: ["Join wellness challenge", "Track your progress"],
  };

  categories.forEach(category => {
    const activities = activityMap[category.toLowerCase()] || [];
    suggestions.activities.push(...activities);
  });

  // Suggest support groups
  const groups = await prisma.supportGroup.findMany({
    where: {
      isActive: true,
      topic: {
        in: userProfile?.interestedTopics || [],
      },
    },
    take: 3,
    select: {
      id: true,
      name: true,
      description: true,
      topic: true,
    },
  });

  suggestions.groups = groups;

  return suggestions;
}