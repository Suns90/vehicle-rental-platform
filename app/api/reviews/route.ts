import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch reviews (optionally filtered by vehicleId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    const reviews = await prisma.review.findMany({
      where: vehicleId ? { vehicleId } : {},
      include: {
        user: { select: { name: true } },
        vehicle: { select: { make: true, model: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, reviews }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST: Submit a review for a completed rental booking
export async function POST(request: Request) {
  try {
    const { bookingId, userId, vehicleId, rating, comment } = await request.json();

    if (!bookingId || !userId || !vehicleId || !rating) {
      return NextResponse.json({ success: false, error: 'Missing required review fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Verify the booking is completed and belongs to the user
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.userId !== userId || booking.vehicleId !== vehicleId) {
      return NextResponse.json({ success: false, error: 'Invalid booking reference for this user and vehicle' }, { status: 400 });
    }

    if (booking.status !== 'COMPLETED' && booking.status !== 'CONFIRMED') {
      return NextResponse.json({ success: false, error: 'Can only review active or completed bookings' }, { status: 400 });
    }

    // Create the review (Prisma unique constraint ensures one review per booking)
    const review = await prisma.review.create({
      data: {
        bookingId,
        userId,
        vehicleId,
        rating: Number(rating),
        comment: comment || ''
      }
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'A review has already been submitted for this booking' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error while submitting review' }, { status: 500 });
  }
}