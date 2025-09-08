"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  User,
  Heart,
  Shield,
  Brain,
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { UserRole } from "@/types/enums";
import { EnhancedUserSchemas } from "@/lib/validation/schemas";

// Use enhanced validation schema with security validation
const signupSchema = EnhancedUserSchemas.registration;

type SignupFormData = z.infer<typeof signupSchema>;

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  features: string[];
  requiresVerification?: boolean;
}

const roleOptions: RoleOption[] = [
  {
    value: UserRole.USER,
    label: "I need support",
    description: "Access wellness tools and community support",
    icon: User,
    color: "bg-blue-500",
    features: [
      "AI-powered chat support",
      "Mood tracking & journaling",
      "Wellness resources & tools",
      "Community peer support",
      "Crisis intervention access",
    ],
  },
  {
    value: UserRole.HELPER,
    label: "I want to help others",
    description: "Become a peer supporter in our community",
    icon: Heart,
    color: "bg-green-500",
    features: [
      "Support community members",
      "Lead wellness groups",
      "Share your experience",
      "Mentor others in recovery",
      "Access helper resources",
    ],
    requiresVerification: true,
  },
  {
    value: UserRole.THERAPIST,
    label: "I'm a mental health professional",
    description: "Provide professional therapy services",
    icon: Brain,
    color: "bg-purple-500",
    features: [
      "Professional client management",
      "Session scheduling & notes",
      "Crisis intervention tools",
      "Analytics & progress tracking",
      "Professional resources",
    ],
    requiresVerification: true,
  },
  {
    value: UserRole.CRISIS_COUNSELOR,
    label: "I'm a crisis counselor",
    description: "Specialize in crisis intervention",
    icon: Shield,
    color: "bg-red-500",
    features: [
      "Crisis hotline dashboard",
      "Emergency protocol access",
      "Real-time crisis alerts",
      "Specialized training materials",
      "Escalation management",
    ],
    requiresVerification: true,
  },
];

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: UserRole.USER,
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
  });

  const watchedRole = watch("role");

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      toast.success("Registration successful! Please check your email for verification.");
      
      // Redirect based on role
      if (data.role === UserRole.USER) {
        router.push("/auth/verify-email");
      } else {
        router.push("/auth/verify-email?professional=true");
      }

    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoleOption = roleOptions.find(option => option.value === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">
            Join Astral Core
          </h1>
          <p className="text-neutral-600">
            Create your account to start your mental wellness journey
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            {/* Role Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4">
                How would you like to participate?
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                {roleOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = selectedRole === option.value;
                  
                  return (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedRole(option.value);
                        setValue("role", option.value);
                      }}
                      className={`
                        p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? "border-primary-500 bg-primary-50" 
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                        }
                      `}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`${option.color} p-3 rounded-lg text-white`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-neutral-800 mb-1">
                            {option.label}
                          </h3>
                          <p className="text-sm text-neutral-600 mb-3">
                            {option.description}
                          </p>
                          {option.requiresVerification && (
                            <div className="flex items-center text-xs text-amber-600 mb-2">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Requires verification
                            </div>
                          )}
                          <ul className="space-y-1">
                            {option.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="flex items-center text-xs text-neutral-600">
                                <UserCheck className="w-3 h-3 text-green-500 mr-2" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {errors.role && (
                <p className="text-red-600 text-sm mt-2">{errors.role.message}</p>
              )}
            </div>

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  First Name
                </label>
                <input
                  {...register("firstName")}
                  type="text"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Last Name
                </label>
                <input
                  {...register("lastName")}
                  type="text"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                <input
                  {...register("email")}
                  type="email"
                  className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-12 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                  <input
                    {...register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full pl-12 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <input
                  {...register("agreeToTerms")}
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label className="text-sm text-neutral-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                    Terms of Service
                  </Link>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-600 text-sm">{errors.agreeToTerms.message}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  {...register("agreeToPrivacy")}
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label className="text-sm text-neutral-600">
                  I agree to the{" "}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {errors.agreeToPrivacy && (
                <p className="text-red-600 text-sm">{errors.agreeToPrivacy.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center mt-6">
              <p className="text-neutral-600">
                Already have an account?{" "}
                <Link 
                  href="/auth/signin"
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}