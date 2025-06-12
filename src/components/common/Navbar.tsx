'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { LogOut, LayoutDashboard, Archive, Thermometer, UserCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export default function Navbar() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error: any) {
      toast({ title: 'Logout Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <nav className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
            <Thermometer size={28} />
            <h1 className="text-2xl font-headline font-semibold">ThermoTrack</h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary">
              <Link href="/dashboard">
                <LayoutDashboard size={20} className="mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild className="text-foreground hover:bg-primary/10 hover:text-primary">
              <Link href="/deleted-logs">
                <Archive size={20} className="mr-2" />
                Deleted Logs
              </Link>
            </Button>
            {currentUser && (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2 rounded-full hover:bg-primary/10">
                    <UserCircle size={24} className="text-primary" />
                    <span className="font-medium hidden sm:inline">{currentUser.displayName || currentUser.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
