'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Eye, EyeOff, Thermometer } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type AuthFormProps = {
  mode: 'login' | 'register';
};

export default function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const currentSchema = mode === 'login' ? loginSchema : registerSchema;
  type FormData = z.infer<typeof currentSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(currentSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (mode === 'register') {
        const { name, email, password } = data as z.infer<typeof registerSchema>;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        toast({ title: 'Registration Successful', description: 'Welcome to ThermoTrack!' });
        router.push('/dashboard');
      } else {
        const { email, password } = data as z.infer<typeof loginSchema>;
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary text-primary-foreground rounded-full inline-block">
            <Thermometer size={32} />
          </div>
          <CardTitle className="text-3xl font-headline">
            {mode === 'login' ? 'Welcome Back to ThermoTrack' : 'Join ThermoTrack'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Log in to access your temperature data.' : 'Create an account to start tracking.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" type="text" {...register('name')} placeholder="John Doe" />
                {errors.name && <p className="text-sm text-destructive">{(errors.name as any)?.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@example.com" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} {...register('password')} placeholder="••••••••" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : (mode === 'login' ? 'Log In' : 'Register')}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Button variant="link" onClick={() => router.push(mode === 'login' ? '/register' : '/login')} className="p-0 h-auto font-semibold text-primary">
                {mode === 'login' ? 'Register here' : 'Log in here'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
