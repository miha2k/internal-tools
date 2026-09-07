import { NextResponse } from 'next/server';
import { setCurrentUser } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await setCurrentUser(userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error switching user:', error);
    return NextResponse.json({ error: 'Failed to switch user' }, { status: 500 });
  }
}