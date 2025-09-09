import { faker } from '@faker-js/faker';
import { User, UserRole, Post, Comment, Session, CrisisAlert, SafetyPlan } from '@prisma/client';

// User factory
export const createMockUser = (overrides: Partial<User> = {}): User => {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    anonymousId: faker.string.uuid(),
    email: faker.internet.email(),
    hashedPassword: faker.internet.password(),
    role: UserRole.USER,
    permissions: [],
    isActive: true,
    isEmailVerified: false,
    avatar: faker.image.avatar(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.past(),
    phoneNumber: faker.phone.number(),
    emergencyContact: faker.person.fullName(),
    emergencyPhone: faker.phone.number(),
    preferredLanguage: 'en',
    timezone: 'UTC',
    isVerified: true,
    mfaEnabled: false,
    lastLoginAt: faker.date.recent(),
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Enhanced user factory with specific roles
export const createMockUserWithRole = (role: UserRole, overrides: Partial<User> = {}): User => {
  const baseUser = createMockUser(overrides);
  return {
    ...baseUser,
    role,
    permissions: role === UserRole.ADMIN ? ['admin', 'user'] : ['user'],
  };
};

// Admin user factory
export const createMockAdmin = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.ADMIN, {
    email: 'admin@example.com',
    isEmailVerified: true,
    ...overrides,
  });
};

// Therapist user factory
export const createMockTherapist = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.THERAPIST, {
    email: 'therapist@example.com',
    isEmailVerified: true,
    ...overrides,
  });
};

// Patient user factory
export const createMockPatient = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.USER, {
    email: 'patient@example.com',
    ...overrides,
  });
};

// Post factory
export const createMockPost = (overrides: Partial<Post> = {}): Post => {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(),
    authorId: faker.string.uuid(),
    published: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Comment factory
export const createMockComment = (overrides: Partial<Comment> = {}): Comment => {
  return {
    id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    authorId: faker.string.uuid(),
    postId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Session factory
export const createMockSession = (overrides: Partial<Session> = {}): Session => {
  return {
    id: faker.string.uuid(),
    sessionToken: faker.string.alphanumeric(32),
    userId: faker.string.uuid(),
    expires: faker.date.future(),
    ...overrides,
  };
};

// Crisis Alert factory
export const createMockCrisisAlert = (overrides: Partial<CrisisAlert> = {}): CrisisAlert => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    severity: 'MEDIUM',
    message: faker.lorem.sentence(),
    resolved: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Safety Plan factory
export const createMockSafetyPlan = (overrides: Partial<SafetyPlan> = {}): SafetyPlan => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraphs(),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Batch factories
export const createMockUsers = (count: number = 5): User[] => {
  return Array.from({ length: count }, () => createMockUser());
};

export const createMockPosts = (count: number = 5): Post[] => {
  return Array.from({ length: count }, () => createMockPost());
};

export const createMockComments = (count: number = 5): Comment[] => {
  return Array.from({ length: count }, () => createMockComment());
};
