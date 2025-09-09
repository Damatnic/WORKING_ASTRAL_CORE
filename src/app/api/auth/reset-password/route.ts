
import { NextRequest, NextResponse } from "next/server";
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const requestResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number, and special character"),
});

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "request") {
      const { email } = requestResetSchema.parse(body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return NextResponse.json({
          message: "If an account exists with this email, you will receive reset instructions",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Delete any existing reset tokens
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id },
      });

      // Create new reset token
      await (prisma.passwordReset as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          token: resetToken,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Log audit event
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          action: "password_reset_requested",
          resource: "user",
          resourceId: user.id,
          outcome: "success",
        },
      });

      // TODO: Send reset email
      // await sendPasswordResetEmail(user.email!, resetToken);

      return NextResponse.json({
        message: "If an account exists with this email, you will receive reset instructions",
      });

    } else if (action === "reset") {
      const { token, password } = resetPasswordSchema.parse(body);

      // Find reset token
      const resetRecord = await prisma.passwordReset.findUnique({
        where: { token },
        include: { User: true },
      });

      if (!resetRecord || resetRecord.used || resetRecord.expires < new Date()) {
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetRecord.userId },
          data: {
            hashedPassword,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }),
        prisma.passwordReset.update({
          where: { id: resetRecord.id },
          data: { used: true },
        }),
      ]);

      // Log audit event
      await (prisma.auditLog as any).create({
        data: {
          id: crypto.randomUUID(),
          userId: resetRecord.userId,
          action: "password_reset_completed",
          resource: "user",
          resourceId: resetRecord.userId,
          outcome: "success",
        },
      });

      return NextResponse.json({
        message: "Password reset successful",
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Password reset error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Password reset failed" },
      { status: 500 }
    );
  }
}

// Verify reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
    });

    const isValid = resetRecord && 
                   !resetRecord.used && 
                   resetRecord.expires > new Date();

    return NextResponse.json({
      valid: !!isValid,
      expired: resetRecord ? resetRecord.expires < new Date() : true,
      used: resetRecord?.used || false,
    });

  } catch (error) {
    console.error("Reset token verification error:", error);
    return NextResponse.json(
      { error: "Token verification failed" },
      { status: 500 }
    );
  }
}