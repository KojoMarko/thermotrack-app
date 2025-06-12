'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function HomePage() {
  const { currentUser, isInitialLoadComplete } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitialLoadComplete) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [currentUser, isInitialLoadComplete, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size={48} />
    </div>
  );
}
