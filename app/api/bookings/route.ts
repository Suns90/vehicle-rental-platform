import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch bookings (optionally filtered by userId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const bookings = await prisma.booking.findMany({
      where: userId ? { userId } : {},
      include: {
        vehicle: { select: { make: true, model: true, licensePlate: true } },
        user: { select: { name: true, email: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, bookings }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST: Create a new booking with automatic fare calculation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, vehicleId, startDate, endDate } = body;

    if (!userId || !vehicleId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Missing required booking fields' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json({ success: false, error: 'End date must be after start date' }, { status: 400 });
    }

    // Fetch vehicle rates and availability
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    if (!vehicle.isAvailable) {
      return NextResponse.json({ success: false, error: 'Vehicle is currently unavailable' }, { status: 400 });
    }

    // Calculate rental duration in hours and days
    const diffHours = Math.abs(end.getTime() - start.getTime()) / 36e5;
    const diffDays = diffHours / 24;

    // Calculate fare: use daily rate if duration >= 24 hours, otherwise hourly rate
    let totalAmount = 0;
    if (diffDays >= 1) {
      totalAmount = Math.ceil(diffDays) * vehicle.dailyRate;
    } else {
      totalAmount = Math.ceil(diffHours) * vehicle.hourlyRate;
    }

    // Create the booking record
    const booking = await prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalAmount,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error while creating booking' }, { status: 500 });
  }
}