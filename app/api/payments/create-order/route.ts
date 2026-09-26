import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(request: Request) {
  try {
    const { bookingId, amount } = await request.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ success: false, error: 'Booking ID and amount are required' }, { status: 400 });
    }

    // Create Razorpay order (amount converted to paise for INR, e.g., 500 INR = 50000 paise)
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_booking_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);

    // Save or update pending payment record in PostgreSQL
    await prisma.payment.upsert({
      where: { bookingId },
      update: { razorpayOrderId: order.id, amount, status: 'PENDING' },
      create: { bookingId, razorpayOrderId: order.id, amount, status: 'PENDING' },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create Razorpay payment order' }, { status: 500 });
  }
}