
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {  createAuditLogData , generatePrismaCreateFields } from "@/lib/prisma-helpers";

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { User: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    if (verification.expires < new Date()) {
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    if (verification.verified) {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Update user and verification record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { verified: true },
      }),
    ]);

    // Log audit event
    await (prisma.auditLog as any).create({
      data: createAuditLogData({
        userId: verification.userId,
        action: "email_verified",
        resource: "user",
        resourceId: verification.userId,
        outcome: "success",
      }),
    });

    return NextResponse.json({
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Email verification failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { User: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: verification.expires > new Date() && !verification.verified,
      email: verification.email,
      expired: verification.expires < new Date(),
      alreadyVerified: verification.verified,
    });

  } catch (error) {
    console.error("Email verification check error:", error);
    return NextResponse.json(
      { error: "Verification check failed" },
      { status: 500 }
    );
  }
}