'use client';

import type { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isInitialLoadComplete: boolean; // To track if the initial auth check is done
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
      setIsInitialLoadComplete(true);
    });

    return () => unsubscribe();
  }, []);

  if (loading && !isInitialLoadComplete) {
    // Show a full-page loader only on initial load
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  }
  
  return (
    <AuthContext.Provider value={{ currentUser, loading, isInitialLoadComplete }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
