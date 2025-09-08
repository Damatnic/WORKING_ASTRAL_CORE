"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { signIn, getProviders } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Form validation schema
const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SigninFormData = z.infer<typeof signinSchema>;

// Demo Login Button Component
interface DemoLoginButtonProps {
  role: string;
  email: string;
  password: string;
  icon: string;
  color: string;
  description: string;
}

function DemoLoginButton({ role, email, password, icon, color, description }: DemoLoginButtonProps) {
  const [isLogging, setIsLogging] = useState(false);
  
  const handleDemoLogin = async () => {
    if (isLogging) return;
    
    setIsLogging(true);
    
    try {
      toast.loading(`Signing in as ${role}...`, { id: 'demo-login' });
      
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(`Failed to sign in as ${role}`, { id: 'demo-login' });
        return;
      }

      toast.success(`Welcome, ${role}!`, { id: 'demo-login' });
      
      // Redirect based on role
      const roleRedirects: Record<string, string> = {
        'Regular User': '/dashboard',
        'Helper': '/helper-dashboard',
        'Therapist': '/therapist-dashboard',
        'Crisis Counselor': '/crisis-dashboard',
        'Admin': '/admin-dashboard',
      };
      
      window.location.href = roleRedirects[role] || '/dashboard';
      
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('Demo login failed', { id: 'demo-login' });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <button
      onClick={handleDemoLogin}
      disabled={isLogging}
      className={`
        relative p-4 text-white rounded-lg transition-all duration-200 transform
        ${color} ${isLogging ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
        shadow-md hover:shadow-lg
      `}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="font-semibold text-sm mb-1">{role}</div>
        <div className="text-xs opacity-90 leading-tight">{description}</div>
        
        {isLogging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </button>
  );
}

export default function SigninPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providers, setProviders] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  useEffect(() => {
    // Get available providers
    getProviders().then(setProviders);

    // Show error if there's one in URL
    if (error) {
      const errorMessages: Record<string, string> = {
        Signin: "Try signing in with a different account.",
        OAuthSignin: "Try signing in with a different account.",
        OAuthCallback: "Try signing in with a different account.",
        OAuthCreateAccount: "Try signing in with a different account.",
        EmailCreateAccount: "Try signing in with a different account.",
        Callback: "Try signing in with a different account.",
        OAuthAccountNotLinked: "To confirm your identity, sign in with the same account you used originally.",
        EmailSignin: "The e-mail could not be sent.",
        CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
        SessionRequired: "Please sign in to access this page.",
        default: "Unable to sign in.",
      };
      
      toast.error(errorMessages[error] || errorMessages.default);
    }
  }, [error]);

  const onSubmit = async (data: SigninFormData) => {
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        return;
      }

      toast.success("Welcome back!");
      router.push(callbackUrl);
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="bg-primary-500 rounded-full p-3 mr-3">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-800">
              Welcome Back
            </h1>
          </motion.div>
          
          <p className="text-neutral-600">
            Sign in to continue your wellness journey
          </p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div>
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

            {/* Password */}
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
                  placeholder="Enter your password"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  {...register("rememberMe")}
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label className="ml-2 text-sm text-neutral-600">
                  Remember me
                </label>
              </div>
              
              <Link 
                href="/auth/reset-password"
                className="text-sm text-primary-600 hover:text-primary-700 underline"
              >
                Forgot password?
              </Link>
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
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-neutral-300"></div>
            <span className="px-4 text-sm text-neutral-500">or</span>
            <div className="flex-1 border-t border-neutral-300"></div>
          </div>

          {/* Google Sign In */}
          {providers?.google && (
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center px-6 py-3 border-2 border-neutral-300 text-neutral-700 rounded-xl font-medium hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          )}

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link 
                href="/auth/signup"
                className="text-primary-600 hover:text-primary-700 font-medium underline"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Quick Demo Login Buttons */}
          <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">🚀 Quick Demo Login</h3>
              <p className="text-sm text-blue-600">
                One-click sign in to test different user roles
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <DemoLoginButton
                role="Regular User"
                email="user@demo.astralcore.com"
                password="Demo123!"
                icon="👤"
                color="bg-blue-500 hover:bg-blue-600"
                description="Access wellness tools & community"
              />
              
              <DemoLoginButton
                role="Helper"
                email="helper@demo.astralcore.com"
                password="Helper123!"
                icon="🤝"
                color="bg-green-500 hover:bg-green-600"
                description="Peer support & mentoring"
              />
              
              <DemoLoginButton
                role="Therapist"
                email="therapist@demo.astralcore.com"
                password="Therapist123!"
                icon="🧠"
                color="bg-purple-500 hover:bg-purple-600"
                description="Professional therapy tools"
              />
              
              <DemoLoginButton
                role="Crisis Counselor"
                email="crisis@demo.astralcore.com"
                password="Crisis123!"
                icon="🆘"
                color="bg-red-500 hover:bg-red-600"
                description="Emergency response tools"
              />
              
              <DemoLoginButton
                role="Admin"
                email="admin@demo.astralcore.com"
                password="Admin123!"
                icon="⚙️"
                color="bg-gray-600 hover:bg-gray-700"
                description="Platform management"
              />
              
              <div className="flex items-center justify-center p-4 bg-white border-2 border-dashed border-blue-300 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <p className="text-xs text-blue-600 font-medium">Or use manual login above</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-blue-500">
                💡 Each role has different permissions and dashboard views
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-neutral-500">
          <Link 
            href="/"
            className="text-primary-600 hover:text-primary-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}