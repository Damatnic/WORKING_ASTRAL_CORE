#!/usr/bin/env node

/**
 * Database setup and seeding script for AstralCore V5
 */

const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🗄️  Setting up AstralCore V5 database...\n');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Create demo users for testing
    console.log('👥 Creating demo users...');

    // Demo regular user
    const userPassword = await bcrypt.hash('Demo123!', 12);
    const demoUser = await prisma.user.upsert({
      where: { email: 'user@demo.astralcore.com' },
      update: {},
      create: {
        email: 'user@demo.astralcore.com',
        hashedPassword: userPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        displayName: 'Sarah Johnson',
        role: 'USER',
        isEmailVerified: true,
        privacySettings: JSON.stringify({
          shareProfile: false,
          allowDirectMessages: true,
          showOnlineStatus: false,
        }),
        userProfile: {
          create: {
            mentalHealthGoals: ['reduce_anxiety', 'improve_sleep', 'build_coping_skills'],
            interestedTopics: ['mindfulness', 'therapy', 'peer_support'],
            preferredCommunication: ['chat', 'video'],
            crisisContacts: JSON.stringify([
              {
                name: 'Emergency Services',
                phone: '911',
                relationship: 'emergency'
              },
              {
                name: 'Crisis Text Line',
                phone: '741741',
                relationship: 'crisis_support'
              }
            ]),
            notificationSettings: JSON.stringify({
              email: true,
              push: true,
              crisis: true,
              appointments: true,
            }),
            onboardingCompleted: true,
          }
        }
      },
    });

    // Demo helper
    const helperPassword = await bcrypt.hash('Helper123!', 12);
    const demoHelper = await prisma.user.upsert({
      where: { email: 'helper@demo.astralcore.com' },
      update: {},
      create: {
        email: 'helper@demo.astralcore.com',
        hashedPassword: helperPassword,
        firstName: 'Michael',
        lastName: 'Chen',
        displayName: 'Michael Chen',
        role: 'HELPER',
        isEmailVerified: true,
        privacySettings: JSON.stringify({
          shareProfile: true,
          allowDirectMessages: true,
          showOnlineStatus: true,
        }),
        helperProfile: {
          create: {
            title: 'Mr.',
            specializations: ['peer_support', 'anxiety', 'depression'],
            credentials: JSON.stringify({
              certifications: ['Peer Support Specialist'],
              training: ['Mental Health First Aid', 'Crisis Intervention']
            }),
            experience: '3 years of peer support experience',
            approach: 'Empathetic listening and shared experience',
            languages: ['en', 'es'],
            availability: JSON.stringify({
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '15:00' },
            }),
            isVerified: true,
            verificationDate: new Date(),
            backgroundCheckCompleted: true,
            backgroundCheckDate: new Date(),
            requiredTrainingCompleted: true,
            trainingCompletionDate: new Date(),
          }
        }
      },
    });

    // Demo therapist
    const therapistPassword = await bcrypt.hash('Therapist123!', 12);
    const demoTherapist = await prisma.user.upsert({
      where: { email: 'therapist@demo.astralcore.com' },
      update: {},
      create: {
        email: 'therapist@demo.astralcore.com',
        hashedPassword: therapistPassword,
        firstName: 'Dr. Emily',
        lastName: 'Rodriguez',
        displayName: 'Dr. Emily Rodriguez',
        role: 'THERAPIST',
        isEmailVerified: true,
        privacySettings: JSON.stringify({
          shareProfile: true,
          allowDirectMessages: true,
          showOnlineStatus: true,
        }),
        helperProfile: {
          create: {
            title: 'Dr.',
            specializations: ['cbt', 'trauma', 'anxiety', 'depression'],
            credentials: JSON.stringify({
              licenses: ['Licensed Clinical Social Worker (LCSW)'],
              certifications: ['Trauma-Focused CBT', 'EMDR'],
              education: ['MSW - Clinical Social Work'],
            }),
            experience: '8 years of clinical practice',
            approach: 'Cognitive Behavioral Therapy with trauma-informed care',
            languages: ['en', 'es'],
            availability: JSON.stringify({
              monday: { start: '08:00', end: '18:00' },
              tuesday: { start: '08:00', end: '18:00' },
              wednesday: { start: '08:00', end: '18:00' },
              thursday: { start: '08:00', end: '18:00' },
              friday: { start: '08:00', end: '16:00' },
            }),
            isVerified: true,
            verificationDate: new Date(),
            backgroundCheckCompleted: true,
            backgroundCheckDate: new Date(),
            requiredTrainingCompleted: true,
            trainingCompletionDate: new Date(),
            rating: 4.8,
            totalReviews: 47,
          }
        }
      },
    });

    // Demo crisis counselor
    const crisisPassword = await bcrypt.hash('Crisis123!', 12);
    const demoCrisis = await prisma.user.upsert({
      where: { email: 'crisis@demo.astralcore.com' },
      update: {},
      create: {
        email: 'crisis@demo.astralcore.com',
        hashedPassword: crisisPassword,
        firstName: 'Emma',
        lastName: 'Thompson',
        displayName: 'Emma Thompson',
        role: 'CRISIS_COUNSELOR',
        isEmailVerified: true,
        privacySettings: JSON.stringify({
          shareProfile: false,
          allowDirectMessages: true,
          showOnlineStatus: true,
        }),
        helperProfile: {
          create: {
            title: 'Ms.',
            specializations: ['crisis_intervention', 'suicide_prevention', 'emergency_response'],
            credentials: JSON.stringify({
              certifications: [
                'Crisis Intervention Specialist',
                'QPR (Question, Persuade, Refer) Suicide Prevention',
                'Mental Health First Aid Instructor'
              ],
              training: [
                'Crisis Text Line Training',
                'National Suicide Prevention Lifeline',
                'Psychological First Aid'
              ]
            }),
            experience: '5 years in crisis intervention and emergency response',
            approach: 'Immediate safety assessment with compassionate crisis de-escalation',
            languages: ['en'],
            availability: JSON.stringify({
              available_24_7: true,
              on_call_schedule: 'rotating'
            }),
            isVerified: true,
            verificationDate: new Date(),
            backgroundCheckCompleted: true,
            backgroundCheckDate: new Date(),
            requiredTrainingCompleted: true,
            trainingCompletionDate: new Date(),
          }
        }
      },
    });

    // Demo admin
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const demoAdmin = await prisma.user.upsert({
      where: { email: 'admin@demo.astralcore.com' },
      update: {},
      create: {
        email: 'admin@demo.astralcore.com',
        hashedPassword: adminPassword,
        firstName: 'Alex',
        lastName: 'Thompson',
        displayName: 'Alex Thompson',
        role: 'ADMIN',
        isEmailVerified: true,
        privacySettings: JSON.stringify({
          shareProfile: false,
          allowDirectMessages: true,
          showOnlineStatus: true,
        }),
        adminProfile: {
          create: {
            adminLevel: 'ADMINISTRATOR',
            departments: ['platform_management', 'user_support', 'content_moderation'],
            permissions: JSON.stringify({
              can_manage_users: true,
              can_access_analytics: true,
              can_moderate_content: true,
              can_manage_helpers: true,
              can_handle_crisis: false,
              can_manage_system: true,
            }),
            employeeId: 'EMP001',
            department: 'Platform Operations',
          }
        }
      },
    });

    console.log('✅ Demo users created:');
    console.log('   📧 user@demo.astralcore.com (password: Demo123!)');
    console.log('   📧 helper@demo.astralcore.com (password: Helper123!)');
    console.log('   📧 therapist@demo.astralcore.com (password: Therapist123!)');
    console.log('   📧 crisis@demo.astralcore.com (password: Crisis123!)');
    console.log('   📧 admin@demo.astralcore.com (password: Admin123!)');

    // Create some sample data
    console.log('📊 Creating sample data...');

    // Create anonymous identities for community features
    await prisma.anonymousIdentity.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        displayName: 'HopefulTraveler',
        avatar: '🌟',
        colorTheme: 'blue',
        trustScore: 0.8,
        badges: [
          JSON.stringify({ type: 'welcome', name: 'New Member', earnedAt: new Date() })
        ],
        languages: ['en'],
      }
    });

    console.log('✅ Sample data created');
    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📝 What was created:');
    console.log('• 5 demo user accounts (one for each role)');
    console.log('• User profiles with realistic data');
    console.log('• Helper/therapist profiles with credentials');
    console.log('• Admin profile with permissions');
    console.log('• Sample anonymous identities');
    console.log('');
    console.log('🔐 Demo Login Credentials:');
    console.log('• Regular User: user@demo.astralcore.com / Demo123!');
    console.log('• Helper: helper@demo.astralcore.com / Helper123!');
    console.log('• Therapist: therapist@demo.astralcore.com / Therapist123!');
    console.log('• Crisis Counselor: crisis@demo.astralcore.com / Crisis123!');
    console.log('• Admin: admin@demo.astralcore.com / Admin123!');
    console.log('');
    console.log('🚀 You can now start the development server and test authentication!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Database setup error:', e);
    process.exit(1);
  });