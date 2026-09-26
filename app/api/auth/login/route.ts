import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    // Find user in PostgreSQL database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) { 
      // Note: In production, use bcrypt hash comparison
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Issue JWT token containing user id and role (RBAC)
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during authentication' }, { status: 500 });
  }
}