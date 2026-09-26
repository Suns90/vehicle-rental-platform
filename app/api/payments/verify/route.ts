import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(request: Request) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return NextResponse.json({ success: false, error: 'Missing payment verification parameters' }, { status: 400 });
    }

    // Cryptographic signature validation using HMAC SHA256
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await prisma.payment.update({
        where: { bookingId },
        data: { status: 'FAILED' },
      });
      return NextResponse.json({ success: false, error: 'Invalid payment cryptographic signature' }, { status: 400 });
    }

    // Transactional update: mark payment success, confirm booking, and set vehicle unavailable
    await prisma.$transaction([
      prisma.payment.update({
        where: { bookingId },
        data: { status: 'SUCCESS' },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
      prisma.vehicle.updateMany({
        where: { bookings: { some: { id: bookingId } } },
        data: { isAvailable: false },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Payment verified and booking confirmed successfully' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error during payment verification' }, { status: 500 });
  }
}