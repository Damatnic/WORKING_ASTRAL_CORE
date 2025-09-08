"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Users, 
  Shield, 
  Heart, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'therapist' | 'admin' | 'crisis_counselor';
  description: string;
  icon: React.ElementType;
  color: string;
  features: string[];
}

const demoUsers: DemoUser[] = [
  {
    id: 'demo-user-1',
    name: 'Sarah Johnson',
    email: 'sarah.demo@astralcore.dev',
    role: 'user',
    description: 'Regular user exploring mental wellness',
    icon: User,
    color: 'bg-blue-500',
    features: [
      'AI Chat Support',
      'Mood Tracking', 
      'Wellness Resources',
      'Community Access'
    ]
  },
  {
    id: 'demo-therapist-1',
    name: 'Dr. Michael Chen',
    email: 'dr.chen.demo@astralcore.dev',
    role: 'therapist',
    description: 'Licensed therapist with client management',
    icon: Brain,
    color: 'bg-green-500',
    features: [
      'Client Dashboard',
      'Session Management',
      'Progress Analytics',
      'Crisis Alerts'
    ]
  },
  {
    id: 'demo-crisis-1',
    name: 'Emma Rodriguez',
    email: 'emma.crisis.demo@astralcore.dev',
    role: 'crisis_counselor',
    description: 'Crisis intervention specialist',
    icon: Heart,
    color: 'bg-red-500',
    features: [
      'Crisis Dashboard',
      'Emergency Protocols',
      'Real-time Alerts',
      'Immediate Response'
    ]
  },
  {
    id: 'demo-admin-1',
    name: 'Alex Thompson',
    email: 'alex.admin.demo@astralcore.dev',
    role: 'admin',
    description: 'Platform administrator',
    icon: Shield,
    color: 'bg-purple-500',
    features: [
      'System Analytics',
      'User Management',
      'Platform Settings',
      'Full Access'
    ]
  }
];

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleDemoLogin = async (user: DemoUser) => {
    setIsLoading(user.id);
    
    try {
      // Simulate demo login process
      toast.loading(`Logging in as ${user.name}...`, { id: 'demo-login' });
      
      // In a real implementation, this would authenticate with the demo user
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success(`Welcome back, ${user.name}!`, { id: 'demo-login' });
      
      // Redirect based on user role
      const redirectMap = {
        user: '/dashboard',
        therapist: '/therapist-dashboard',
        crisis_counselor: '/crisis-dashboard',
        admin: '/admin-dashboard'
      };
      
      window.location.href = redirectMap[user.role] || '/dashboard';
      
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error('Login failed. Please try again.', { id: 'demo-login' });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center mb-6"
          >
            <div className="bg-primary-500 rounded-full p-4 mr-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-800">
              Astral Core V5
            </h1>
          </motion.div>
          
          <p className="text-xl text-neutral-600 mb-2">
            Mental Health & Wellness Platform
          </p>
          <p className="text-sm text-neutral-500">
            Choose a demo user to explore the platform
          </p>
        </div>

        {/* Demo User Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {demoUsers.map((user, index) => {
            const IconComponent = user.icon;
            const isLoadingUser = isLoading === user.id;
            
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl shadow-soft border border-neutral-200 overflow-hidden hover:shadow-glow transition-all duration-300"
              >
                <div className={`${user.color} p-4 text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <IconComponent className="w-6 h-6" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{user.name}</h3>
                  <p className="text-sm opacity-90">{user.description}</p>
                </div>
                
                <div className="p-4">
                  <ul className="space-y-2 mb-6">
                    {user.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm text-neutral-600">
                        <UserCheck className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    onClick={() => handleDemoLogin(user)}
                    disabled={!!isLoading}
                    className={`
                      w-full flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-white
                      transition-all duration-200 group
                      ${isLoadingUser 
                        ? 'bg-neutral-400 cursor-not-allowed' 
                        : `${user.color} hover:opacity-90 hover:scale-105`
                      }
                    `}
                  >
                    {isLoadingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login as {user.name.split(' ')[0]}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Alternative Login Options */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 text-center"
        >
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">
            Other Login Options
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => signIn('google')}
              className="flex items-center justify-center px-6 py-3 bg-white border-2 border-neutral-300 rounded-xl font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200"
            >
              <Users className="w-5 h-5 mr-2" />
              Sign in with Google
            </button>
            
            <Link 
              href="/auth/signup"
              className="flex items-center justify-center px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all duration-200"
            >
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          
          <p className="text-xs text-neutral-500 mt-4">
            Demo users are pre-configured for testing. No real credentials required.
          </p>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-neutral-500">
          <p>© 2024 Astral Core V5. Mental Health Platform Demo.</p>
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
};

export default LoginPage;