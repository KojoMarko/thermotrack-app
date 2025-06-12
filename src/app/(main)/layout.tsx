'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { currentUser, loading, isInitialLoadComplete } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialLoadComplete && !loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, isInitialLoadComplete, router]);

  if (loading || !isInitialLoadComplete || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} ThermoTrack. All rights reserved.
      </footer>
    </div>
  );
}
