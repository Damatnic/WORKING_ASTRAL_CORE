// Community moderation utilities with crisis detection and content safety
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Crisis keywords and patterns for detection
const CRISIS_PATTERNS = {
  high_risk: [
    /\b(suicide|suicidal|kill myself|end it all|want to die|can't go on)\b/gi,
    /\b(self[\s-]?harm|cutting|hurting myself|overdose)\b/gi,
    /\b(no reason to live|life is meaningless|better off dead)\b/gi,
    /\b(planning to|going to|decided to)\s+(die|end|kill|hurt)/gi,
  ],
  medium_risk: [
    /\b(depressed|depression|hopeless|worthless|alone|isolated)\b/gi,
    /\b(anxiety|panic|scared|terrified|can't breathe)\b/gi,
    /\b(nobody cares|no one understands|burden to everyone)\b/gi,
    /\b(giving up|can't take it|falling apart)\b/gi,
  ],
  support_needed: [
    /\b(need help|someone to talk|crisis|emergency)\b/gi,
    /\b(struggling|difficult time|hard time|tough time)\b/gi,
    /\b(thoughts of|thinking about|considering)\s+(suicide|self-harm)/gi,
  ],
};

// Spam detection patterns
const SPAM_PATTERNS = [
  /\b(viagra|cialis|pills|medication|drugs)\b/gi,
  /\b(click here|free money|earn \$|make money fast)\b/gi,
  /\b(casino|gambling|lottery|winner)\b/gi,
  /(http|https|www)\S+\.(tk|ml|ga|cf)/gi, // Suspicious domains
  /(.)\1{10,}/g, // Repeated characters
  /[A-Z]{10,}/g, // Excessive caps
];

// Inappropriate content patterns
const INAPPROPRIATE_PATTERNS = [
  /\b(hate|racist|sexist|homophobic|transphobic)\b/gi,
  /\b(violence|violent|attack|assault|abuse)\b/gi,
  /\b(harass|harassment|bully|bullying|threat)\b/gi,
];

export interface ModerationResult {
  safe: boolean;
  crisisDetected: boolean;
  crisisLevel?: "high" | "medium" | "low";
  spamDetected: boolean;
  inappropriateContent: boolean;
  reasons: string[];
  suggestedActions: string[];
  requiresReview: boolean;
}

export interface CrisisDetectionResult {
  detected: boolean;
  level: "high" | "medium" | "low" | "none";
  keywords: string[];
  suggestedInterventions: string[];
  notifyModerators: boolean;
  triggerSafetyPlan: boolean;
}

// Main content moderation function
export async function moderateContent(
  content: string,
  userId?: string,
  contentType: "post" | "message" | "comment" = "post"
): Promise<ModerationResult> {
  const result: ModerationResult = {
    safe: true,
    crisisDetected: false,
    spamDetected: false,
    inappropriateContent: false,
    reasons: [],
    suggestedActions: [],
    requiresReview: false,
  };

  // Crisis detection
  const crisisCheck = detectCrisis(content);
  if (crisisCheck.detected) {
    result.crisisDetected = true;
    result.crisisLevel = crisisCheck.level as "high" | "medium" | "low";
    result.reasons.push(`Crisis content detected (${crisisCheck.level} risk)`);
    result.suggestedActions.push(...crisisCheck.suggestedInterventions);
    result.requiresReview = crisisCheck.level === "high";
    
    // Log crisis detection for immediate response
    if (userId && crisisCheck.level === "high") {
      await logCrisisDetection(userId, content, crisisCheck);
    }
  }

  // Spam detection
  if (detectSpam(content)) {
    result.spamDetected = true;
    result.safe = false;
    result.reasons.push("Spam content detected");
    result.suggestedActions.push("Block content", "Review user account");
    result.requiresReview = true;
  }

  // Inappropriate content detection
  if (detectInappropriateContent(content)) {
    result.inappropriateContent = true;
    result.safe = false;
    result.reasons.push("Inappropriate content detected");
    result.suggestedActions.push("Hide content", "Warn user", "Review for policy violation");
    result.requiresReview = true;
  }

  // User trust score check
  if (userId) {
    const trustScore = await getUserTrustScore(userId);
    if (trustScore < 0.3) {
      result.requiresReview = true;
      result.suggestedActions.push("Manual review due to low trust score");
    }
  }

  // Determine final safety
  result.safe = !result.spamDetected && !result.inappropriateContent && 
                (!result.crisisDetected || result.crisisLevel === "low");

  return result;
}

// Crisis detection function
export function detectCrisis(content: string): CrisisDetectionResult {
  const result: CrisisDetectionResult = {
    detected: false,
    level: "none",
    keywords: [],
    suggestedInterventions: [],
    notifyModerators: false,
    triggerSafetyPlan: false,
  };

  // Check high risk patterns
  for (const pattern of CRISIS_PATTERNS.high_risk) {
    const matches = content.match(pattern);
    if (matches) {
      result.detected = true;
      result.level = "high";
      result.keywords.push(...matches);
      result.notifyModerators = true;
      result.triggerSafetyPlan = true;
      result.suggestedInterventions.push(
        "Immediate crisis intervention required",
        "Display crisis hotline numbers",
        "Activate safety plan",
        "Notify crisis counselor",
        "Offer immediate support chat"
      );
      return result; // High risk takes priority
    }
  }

  // Check medium risk patterns
  for (const pattern of CRISIS_PATTERNS.medium_risk) {
    const matches = content.match(pattern);
    if (matches) {
      result.detected = true;
      result.level = "medium";
      result.keywords.push(...matches);
      result.notifyModerators = true;
      result.suggestedInterventions.push(
        "Display mental health resources",
        "Suggest coping strategies",
        "Offer peer support groups",
        "Recommend professional help"
      );
    }
  }

  // Check support needed patterns
  if (!result.detected) {
    for (const pattern of CRISIS_PATTERNS.support_needed) {
      const matches = content.match(pattern);
      if (matches) {
        result.detected = true;
        result.level = "low";
        result.keywords.push(...matches);
        result.suggestedInterventions.push(
          "Display support resources",
          "Suggest community support groups",
          "Offer self-help tools"
        );
      }
    }
  }

  return result;
}

// Spam detection function
export function detectSpam(content: string): boolean {
  // Check for excessive links
  const linkCount = (content.match(/https?:\/\//gi) || []).length;
  if (linkCount > 3) return true;

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) return true;
  }

  // Check for repeated text
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = words.length;
  const uniqueWords = new Set(words).size;
  if (wordCount > 10 && uniqueWords / wordCount < 0.3) return true;

  return false;
}

// Inappropriate content detection
export function detectInappropriateContent(content: string): boolean {
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(content)) return true;
  }
  return false;
}

// Get user trust score
export async function getUserTrustScore(userId: string): Promise<number> {
  try {
    const trustMetric = await prisma.trustMetric.findUnique({
      where: { userId },
    });
    return trustMetric?.score || 0.5; // Default to neutral score
  } catch (error) {
    console.error("Error fetching trust score:", error);
    return 0.5;
  }
}

// Update user trust score based on actions
export async function updateTrustScore(
  userId: string,
  action: "positive" | "negative",
  weight: number = 0.1
): Promise<void> {
  try {
    const currentMetric = await prisma.trustMetric.findUnique({
      where: { userId },
    });

    const currentScore = currentMetric?.score || 0.5;
    const adjustment = action === "positive" ? weight : -weight;
    const newScore = Math.max(0, Math.min(1, currentScore + adjustment));

    await prisma.trustMetric.upsert({
      where: { userId },
      update: {
        score: newScore,
        lastUpdated: new Date(),
        history: {
          push: {
            action,
            adjustment,
            timestamp: new Date(),
          },
        },
      },
      create: {
        userId,
        score: newScore,
        factors: {},
        history: [{
          action,
          adjustment,
          timestamp: new Date(),
        }],
      },
    });
  } catch (error) {
    console.error("Error updating trust score:", error);
  }
}

// Log crisis detection for immediate response
async function logCrisisDetection(
  userId: string,
  content: string,
  detection: CrisisDetectionResult
): Promise<void> {
  try {
    // Create safety alert
    await prisma.safetyAlert.create({
      data: {
        type: "crisis_content",
        severity: detection.level,
        userId,
        context: content.substring(0, 500), // Truncate for privacy
        indicators: detection.keywords.slice(0, 10), // Limit keywords
        handled: false,
        actions: detection.suggestedInterventions,
      },
    });

    // Create crisis report if high risk
    if (detection.level === "high") {
      await prisma.crisisReport.create({
        data: {
          userId,
          severityLevel: 9, // High severity
          triggerType: "content_detection",
          interventionType: "automated_detection",
          encryptedDetails: {
            detection: detection,
            timestamp: new Date(),
          },
          responseTime: 0, // Immediate
          resolved: false,
        },
      });
    }

    // Send notification to crisis counselors
    if (detection.notifyModerators) {
      const counselors = await prisma.user.findMany({
        where: {
          role: UserRole.CRISIS_COUNSELOR,
          isActive: true,
        },
        select: { id: true },
      });

      for (const counselor of counselors) {
        await prisma.notification.create({
          data: {
            userId: counselor.id,
            type: "crisis_alert",
            title: "Crisis Content Detected",
            message: `A user may be in crisis (${detection.level} risk). Immediate attention required.`,
            isPriority: true,
            metadata: {
              userId,
              level: detection.level,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error logging crisis detection:", error);
  }
}

// Filter profanity (basic implementation)
export function filterProfanity(content: string): string {
  // Basic profanity list (expand as needed)
  const profanityList = [
    "damn", "hell", "crap", // Mild profanity allowed in mental health context
  ];
  
  let filtered = content;
  for (const word of profanityList) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    filtered = filtered.replace(regex, "*".repeat(word.length));
  }
  
  return filtered;
}

// Check if user is banned or restricted
export async function isUserRestricted(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, lockedUntil: true },
    });

    if (!user || !user.isActive) return true;
    if (user.lockedUntil && user.lockedUntil > new Date()) return true;

    // Check for active moderation actions
    const activeActions = await prisma.moderationAction.findFirst({
      where: {
        targetUserId: userId,
        type: { in: ["ban", "suspend", "restrict"] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return !!activeActions;
  } catch (error) {
    console.error("Error checking user restrictions:", error);
    return true; // Err on the side of caution
  }
}

// Sanitize content for display
export function sanitizeContent(content: string): string {
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, "");
  
  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove on* attributes
  sanitized = sanitized.replace(/on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*'[^']*'/gi, "");
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
  
  return sanitized;
}

// Rate limiting check for content creation
const contentRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkContentRateLimit(
  userId: string,
  limitPerMinute: number = 5
): boolean {
  const now = Date.now();
  const userLimit = contentRateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    contentRateLimits.set(userId, {
      count: 1,
      resetTime: now + 60000, // 1 minute
    });
    return true;
  }
  
  if (userLimit.count >= limitPerMinute) {
    return false;
  }
  
  userLimit.count++;
  return true;
}