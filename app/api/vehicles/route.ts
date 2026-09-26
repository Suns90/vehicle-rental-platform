import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all vehicles (supports filtering for available cars)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get('available') === 'true';

    const vehicles = await prisma.vehicle.findMany({
      where: availableOnly ? { isAvailable: true } : {},
      include: {
        owner: { select: { name: true, email: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, vehicles }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicle inventory' }, { status: 500 });
  }
}

// POST: Register a new vehicle into the rental platform
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ownerId, make, model, year, licensePlate, hourlyRate, dailyRate } = body;

    if (!ownerId || !make || !model || !year || !licensePlate || !hourlyRate || !dailyRate) {
      return NextResponse.json({ success: false, error: 'Missing required vehicle fields' }, { status: 400 });
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        ownerId,
        make,
        model,
        year: Number(year),
        licensePlate,
        hourlyRate: Number(hourlyRate),
        dailyRate: Number(dailyRate),
        isAvailable: true
      }
    });

    return NextResponse.json({ success: true, vehicle: newVehicle }, { status: 201 });
  } catch (error: any) {
    // Handle Prisma unique constraint violation for license plates
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A vehicle with this license plate already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error while registering vehicle' }, { status: 500 });
  }
}