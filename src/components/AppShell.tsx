'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appRegistry } from '@/lib/registry';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllUsers } from '@/lib/auth';
import { ChevronRight, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const allUsers = getAllUsers();

  useEffect(() => {
    fetchCurrentUser();
    fetchPendingCount();

    // Listen for approval updates
    const handleApprovalsUpdate = () => {
      fetchPendingCount();
    };

    window.addEventListener('approvals-updated', handleApprovalsUpdate);
    return () => {
      window.removeEventListener('approvals-updated', handleApprovalsUpdate);
    };
  }, [pathname]); // Refresh pending count when navigating

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/current-user');
      const user = await response.json();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/approvals');
      const result = await response.json();
      setPendingCount(result.count || 0);
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    }
  };

  const handleUserSwitch = async (userId: string) => {
    try {
      await fetch('/api/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      // Refresh the page to get the new user and pending count
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch user:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'approver': return 'bg-yellow-500';
      case 'operator': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Failed to load user</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <h1 className="text-lg font-semibold">Internal Tools</h1>
        </div>
        
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            <Link href="/">
              <Button
                variant={pathname === '/' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Shield className="mr-2 h-4 w-4" />
                Approvals
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {appRegistry.map((app) => (
              <Link key={app.slug} href={`/app/${app.slug}`}>
                <Button
                  variant={pathname === `/app/${app.slug}` ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  {app.title}
                </Button>
              </Link>
            ))}
          </nav>
        </ScrollArea>
        
        {/* User info and role switcher */}
        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="w-full flex items-center gap-2 px-2 py-2 hover:bg-accent rounded-md cursor-pointer">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarFallback className={getRoleColor(currentUser.role)}>
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{currentUser.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allUsers.map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onClick={() => handleUserSwitch(user.id)}
                    className="cursor-pointer"
                  >
                    <Avatar className="mr-2 h-6 w-6">
                      <AvatarFallback className={getRoleColor(user.role)}>
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {user.role}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {currentUser.role}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={getRoleColor(currentUser.role)}>
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}