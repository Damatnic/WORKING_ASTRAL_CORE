/**
 * WebSocket Middleware Functions
 * Validation, moderation, and security functions
 */

import BadWordsFilter from "bad-words";
import { MessagePayload, MESSAGE_VALIDATION } from "./events";
import { prisma } from "@/lib/prisma";

// Initialize bad words filter
const filter = new BadWordsFilter();

// Add custom bad words for mental health context
filter.addWords(
  "kys",
  "kms",
  "cut",
  "cutting",
  "bleach",
  "noose",
  "pills",
  "overdose",
  "suicide",
  "kill myself",
  "end it all",
  "not worth living",
  "better off dead"
);

// Crisis trigger keywords
const CRISIS_KEYWORDS = {
  high: [
    "suicide",
    "kill myself",
    "end my life",
    "not worth living",
    "better off dead",
    "want to die",
    "can't go on",
    "no point in living",
    "kms",
    "kys",
    "overdose",
    "slit wrists",
    "jump off",
    "hang myself",
    "shoot myself",
    "poison",
    "bleach",
    "noose",
  ],
  medium: [
    "self harm",
    "cutting",
    "burning",
    "hurt myself",
    "punish myself",
    "deserve pain",
    "worthless",
    "hopeless",
    "no hope",
    "give up",
    "can't take it",
    "unbearable",
    "too much pain",
    "nobody cares",
    "all alone",
    "trapped",
    "no way out",
  ],
  low: [
    "depressed",
    "anxious",
    "panic",
    "scared",
    "overwhelmed",
    "struggling",
    "hard time",
    "difficult",
    "stress",
    "worried",
    "sad",
    "lonely",
    "isolated",
    "exhausted",
    "burnt out",
    "crying",
    "can't sleep",
    "nightmares",
  ],
};

// Supportive response templates
const SUPPORTIVE_RESPONSES = {
  high: [
    "I'm really concerned about what you're going through. Your life has value and you deserve support.",
    "Please know that you're not alone. Help is available and things can get better.",
    "I hear that you're in a lot of pain right now. Let's connect you with someone who can help.",
  ],
  medium: [
    "It sounds like you're going through a really tough time. You don't have to face this alone.",
    "Your feelings are valid, and it's okay to ask for help when things feel overwhelming.",
    "I'm here to listen and support you. Would you like to talk more about what you're experiencing?",
  ],
  low: [
    "Thank you for sharing how you're feeling. It takes courage to open up.",
    "It's completely normal to feel this way sometimes. You're taking a positive step by reaching out.",
    "I appreciate you being here. How can I best support you right now?",
  ],
};

// Message validation
export async function validateMessage(
  payload: MessagePayload,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  // Check message length
  if (!payload.content || payload.content.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (payload.content.length > MESSAGE_VALIDATION.maxLength) {
    return {
      valid: false,
      error: `Message exceeds maximum length of ${MESSAGE_VALIDATION.maxLength} characters`,
    };
  }

  if (payload.content.length < MESSAGE_VALIDATION.minLength) {
    return {
      valid: false,
      error: `Message must be at least ${MESSAGE_VALIDATION.minLength} character`,
    };
  }

  // Check attachments
  if (payload.attachments && payload.attachments.length > 0) {
    if (payload.attachments.length > MESSAGE_VALIDATION.maxAttachments) {
      return {
        valid: false,
        error: `Maximum ${MESSAGE_VALIDATION.maxAttachments} attachments allowed`,
      };
    }

    for (const attachment of payload.attachments) {
      if (attachment.size > MESSAGE_VALIDATION.maxAttachmentSize) {
        return {
          valid: false,
          error: `Attachment ${attachment.filename} exceeds maximum size of 50MB`,
        };
      }

      if (!MESSAGE_VALIDATION.allowedMimeTypes.includes(attachment.mimeType)) {
        return {
          valid: false,
          error: `File type ${attachment.mimeType} is not allowed`,
        };
      }
    }
  }

  // Check for spam patterns
  const spamCheck = await checkForSpam(payload.content, userId);
  if (spamCheck.isSpam) {
    return { valid: false, error: spamCheck.reason };
  }

  // Check room-specific rules
  if (payload.roomId) {
    const roomCheck = await checkRoomRules(payload.roomId, payload.content, userId);
    if (!roomCheck.allowed) {
      return { valid: false, error: roomCheck.reason };
    }
  }

  return { valid: true };
}

// Content moderation
export async function moderateContent(
  content: string
): Promise<{
  flagged: boolean;
  severity?: "low" | "medium" | "high";
  reason?: string;
  cleanContent?: string;
}> {
  // Check for profanity
  if (filter.isProfane(content)) {
    const cleanContent = filter.clean(content);
    
    // Determine severity based on context
    const severity = determineContentSeverity(content);
    
    return {
      flagged: true,
      severity,
      reason: "Inappropriate language detected",
      cleanContent,
    };
  }

  // Check for harmful content patterns
  const harmfulPattern = checkHarmfulPatterns(content);
  if (harmfulPattern.detected) {
    return {
      flagged: true,
      severity: harmfulPattern.severity as "low" | "medium" | "high",
      reason: harmfulPattern.reason,
    };
  }

  // Check for personal information disclosure
  const piiCheck = checkForPII(content);
  if (piiCheck.detected) {
    return {
      flagged: true,
      severity: "medium",
      reason: "Personal information detected",
      cleanContent: piiCheck.cleanContent,
    };
  }

  return { flagged: false };
}

// Crisis trigger detection
export async function detectCrisisTriggers(
  content: string
): Promise<{
  detected: boolean;
  severity?: "low" | "medium" | "high";
  triggers?: string[];
  suggestedResponse?: string;
  requiresImmediate?: boolean;
}> {
  const lowerContent = content.toLowerCase();
  const detectedTriggers: string[] = [];
  let highestSeverity: "low" | "medium" | "high" | null = null;

  // Check for high severity triggers
  for (const trigger of CRISIS_KEYWORDS.high) {
    if (lowerContent.includes(trigger)) {
      detectedTriggers.push(trigger);
      highestSeverity = "high";
    }
  }

  // Check for medium severity triggers if no high found
  if (highestSeverity !== "high") {
    for (const trigger of CRISIS_KEYWORDS.medium) {
      if (lowerContent.includes(trigger)) {
        detectedTriggers.push(trigger);
        highestSeverity = "medium";
      }
    }
  }

  // Check for low severity triggers if no medium/high found
  if (!highestSeverity) {
    for (const trigger of CRISIS_KEYWORDS.low) {
      if (lowerContent.includes(trigger)) {
        detectedTriggers.push(trigger);
        highestSeverity = "low";
      }
    }
  }

  if (detectedTriggers.length > 0 && highestSeverity) {
    // Get contextual analysis
    const context = await analyzeContext(content, detectedTriggers);
    
    // Adjust severity based on context
    if (context.isPositive) {
      // User might be talking about recovery or helping others
      highestSeverity = highestSeverity === "high" ? "medium" : 
                       highestSeverity === "medium" ? "low" : "low";
    }

    const responses = SUPPORTIVE_RESPONSES[highestSeverity];
    const suggestedResponse = responses[Math.floor(Math.random() * responses.length)];

    return {
      detected: true,
      severity: highestSeverity,
      triggers: detectedTriggers,
      suggestedResponse,
      requiresImmediate: highestSeverity === "high" && !context.isPositive,
    };
  }

  return { detected: false };
}

// Spam detection
async function checkForSpam(
  content: string,
  userId: string
): Promise<{ isSpam: boolean; reason?: string }> {
  // Check for repeated characters
  if (/(.)\1{9,}/.test(content)) {
    return { isSpam: true, reason: "Excessive character repetition detected" };
  }

  // Check for all caps (more than 80% uppercase)
  const upperCount = (content.match(/[A-Z]/g) || []).length;
  const letterCount = (content.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 10 && upperCount / letterCount > 0.8) {
    return { isSpam: true, reason: "Excessive use of capital letters" };
  }

  // Check for repeated messages from same user
  const recentMessages = await getRecentMessages(userId, 5);
  const duplicates = recentMessages.filter(msg => msg.content === content);
  if (duplicates.length >= 3) {
    return { isSpam: true, reason: "Duplicate message detected" };
  }

  // Check for URL spam
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlPattern) || [];
  if (urls.length > 3) {
    return { isSpam: true, reason: "Too many URLs in message" };
  }

  // Check for suspicious URLs
  for (const url of urls) {
    if (await isSuspiciousUrl(url)) {
      return { isSpam: true, reason: "Suspicious URL detected" };
    }
  }

  return { isSpam: false };
}

// Room rules checking
async function checkRoomRules(
  roomId: string,
  content: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      settings: true,
      ChatModerator: {
        where: { userId },
      },
    },
  });

  if (!room) {
    return { allowed: false, reason: "Room not found" };
  }

  const settings = room.settings as any;
  const isModerator = room.ChatModerator.length > 0;

  // Check slow mode
  if (settings.slowMode && !isModerator) {
    const lastMessage = await getLastMessageTime(userId, roomId);
    if (lastMessage) {
      const timeSinceLastMessage = Date.now() - lastMessage.getTime();
      const slowModeMs = settings.slowMode * 1000;
      
      if (timeSinceLastMessage < slowModeMs) {
        const remainingTime = Math.ceil((slowModeMs - timeSinceLastMessage) / 1000);
        return {
          allowed: false,
          reason: `Slow mode is enabled. Please wait ${remainingTime} seconds`,
        };
      }
    }
  }

  // Check profanity filter setting
  if (settings.profanityFilter && filter.isProfane(content)) {
    return { allowed: false, reason: "Message contains inappropriate language" };
  }

  // Check max message length for room
  if (settings.maxMessageLength && content.length > settings.maxMessageLength) {
    return {
      allowed: false,
      reason: `Message exceeds room limit of ${settings.maxMessageLength} characters`,
    };
  }

  return { allowed: true };
}

// Harmful pattern detection
function checkHarmfulPatterns(
  content: string
): {
  detected: boolean;
  severity?: string;
  reason?: string;
} {
  const lowerContent = content.toLowerCase();

  // Check for grooming patterns
  const groomingPatterns = [
    /\b(send|share|show).{0,20}(pic|photo|image|video)/i,
    /\b(what|where).{0,20}(live|address|school)/i,
    /\b(don't|dont|do not).{0,20}(tell|say).{0,20}(parent|mom|dad|anyone)/i,
    /\b(keep|our).{0,20}secret/i,
    /\b(meet|see).{0,20}(private|alone|secret)/i,
  ];

  for (const pattern of groomingPatterns) {
    if (pattern.test(lowerContent)) {
      return {
        detected: true,
        severity: "high",
        reason: "Potentially unsafe communication pattern detected",
      };
    }
  }

  // Check for harassment patterns
  const harassmentPatterns = [
    /\b(kill|hurt|harm).{0,20}(you|your|urself)/i,
    /\b(hate|despise|loathe).{0,20}(you|your kind|people like)/i,
    /\b(stupid|idiot|moron|retard)/i,
    /\b(ugly|fat|disgusting|worthless)/i,
  ];

  for (const pattern of harassmentPatterns) {
    if (pattern.test(lowerContent)) {
      return {
        detected: true,
        severity: "high",
        reason: "Harassment or bullying detected",
      };
    }
  }

  return { detected: false };
}

// Personal information detection
function checkForPII(
  content: string
): {
  detected: boolean;
  cleanContent?: string;
} {
  let cleanContent = content;
  let detected = false;

  // Phone numbers
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  if (phonePattern.test(content)) {
    detected = true;
    cleanContent = cleanContent.replace(phonePattern, "[PHONE REMOVED]");
  }

  // Email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailPattern.test(content)) {
    detected = true;
    cleanContent = cleanContent.replace(emailPattern, "[EMAIL REMOVED]");
  }

  // Social Security Numbers
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/g;
  if (ssnPattern.test(content)) {
    detected = true;
    cleanContent = cleanContent.replace(ssnPattern, "[SSN REMOVED]");
  }

  // Credit card numbers
  const ccPattern = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  if (ccPattern.test(content)) {
    detected = true;
    cleanContent = cleanContent.replace(ccPattern, "[CARD NUMBER REMOVED]");
  }

  // Street addresses (basic pattern)
  const addressPattern = /\b\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Plaza|Pl)\b/gi;
  if (addressPattern.test(content)) {
    detected = true;
    cleanContent = cleanContent.replace(addressPattern, "[ADDRESS REMOVED]");
  }

  return { detected, cleanContent };
}

// Content severity determination
function determineContentSeverity(content: string): "low" | "medium" | "high" {
  const lowerContent = content.toLowerCase();
  
  // High severity words
  const highSeverityWords = ["fuck", "shit", "bitch", "ass", "damn"];
  for (const word of highSeverityWords) {
    if (lowerContent.includes(word)) {
      return "high";
    }
  }
  
  // Medium severity words
  const mediumSeverityWords = ["hell", "crap", "suck", "stupid"];
  for (const word of mediumSeverityWords) {
    if (lowerContent.includes(word)) {
      return "medium";
    }
  }
  
  return "low";
}

// Context analysis for crisis triggers
async function analyzeContext(
  content: string,
  triggers: string[]
): Promise<{ isPositive: boolean }> {
  const lowerContent = content.toLowerCase();
  
  // Positive context indicators
  const positiveIndicators = [
    "used to",
    "in the past",
    "recovered",
    "better now",
    "helped me",
    "overcame",
    "survived",
    "therapy helped",
    "feeling better",
    "support group",
    "resources",
    "hotline",
    "counselor",
    "doctor",
    "medication helps",
    "coping strategies",
  ];
  
  // Negative context indicators
  const negativeIndicators = [
    "right now",
    "tonight",
    "today",
    "can't take",
    "going to",
    "will",
    "planning",
    "decided",
    "no other way",
    "goodbye",
    "farewell",
    "sorry",
    "forgive me",
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  for (const indicator of positiveIndicators) {
    if (lowerContent.includes(indicator)) {
      positiveScore++;
    }
  }
  
  for (const indicator of negativeIndicators) {
    if (lowerContent.includes(indicator)) {
      negativeScore++;
    }
  }
  
  return { isPositive: positiveScore > negativeScore };
}

// Get recent messages for spam checking
async function getRecentMessages(
  userId: string,
  limit: number
): Promise<{ content: string; createdAt: Date }[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: new Date(Date.now() - 60000), // Last minute
        },
      },
      select: {
        content: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
    
    return messages;
  } catch (error) {
    console.error("Error fetching recent messages:", error);
    return [];
  }
}

// Get last message time for slow mode
async function getLastMessageTime(
  userId: string,
  roomId: string
): Promise<Date | null> {
  try {
    const lastMessage = await prisma.chatMessage.findFirst({
      where: {
        authorId: userId,
        roomId: roomId,
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return lastMessage?.createdAt || null;
  } catch (error) {
    console.error("Error fetching last message time:", error);
    return null;
  }
}

// Check for suspicious URLs
async function isSuspiciousUrl(url: string): Promise<boolean> {
  // List of suspicious domains
  const suspiciousDomains = [
    "bit.ly",
    "tinyurl.com",
    "goo.gl",
    "ow.ly",
    "short.link",
  ];
  
  // Phishing patterns
  const phishingPatterns = [
    /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
    /[a-z]+-[a-z]+\.(tk|ml|ga|cf)/i, // Suspicious TLDs
    /(paypal|amazon|google|microsoft|apple)-[a-z]+\./i, // Phishing attempts
  ];
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check suspicious domains
    for (const suspiciousDomain of suspiciousDomains) {
      if (domain.includes(suspiciousDomain)) {
        return true;
      }
    }
    
    // Check phishing patterns
    for (const pattern of phishingPatterns) {
      if (pattern.test(domain)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // Invalid URL
    return true;
  }
}

// Export helper functions for testing
export const testHelpers = {
  checkHarmfulPatterns,
  checkForPII,
  determineContentSeverity,
  analyzeContext,
  isSuspiciousUrl,
};