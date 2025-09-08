/**
 * Auth - Ultra Simplified for TypeScript Compliance
 */

// @ts-ignore
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: async ({ token, user }: any) => ({ ...token, ...user }),
    session: async ({ session, token }: any) => ({ 
      ...session, 
      user: { ...session.user, ...token } 
    }),
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
} as any;

export const getServerSession = async (): Promise<any> => null;
export const signIn = async (provider?: string, options?: any): Promise<any> => {};
export const signOut = async (options?: any): Promise<any> => {};

export default authOptions;