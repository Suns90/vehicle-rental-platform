import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';
import admin from 'firebase-admin';

const prisma = new PrismaClient();

// Initialize Pusher for real-time web/mobile chat
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true,
});

// Initialize Firebase Admin SDK for push notifications (prevent duplicate init)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle newline formatting in private keys securely
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

// GET: Fetch message history
export async function GET(request: Request) {
  try {
    const messages = await prisma.message.findMany({
      include: { sender: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST: Send a message, trigger Pusher, and send Firebase FCM notification
export async function POST(request: Request) {
  try {
    const { senderId, content, recipientFcmToken } = await request.json();

    if (!senderId || !content) {
      return NextResponse.json({ success: false, error: 'Sender ID and content are required' }, { status: 400 });
    }

    // Save message to database
    const message = await prisma.message.create({
      data: { senderId, content },
      include: { sender: { select: { name: true } } },
    });

    // Trigger Pusher real-time event
    await pusher.trigger('rental-chat-channel', 'new-message', {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      content: message.content,
      createdAt: message.createdAt,
    });

    // Send Firebase FCM notification if recipient token is available
    if (recipientFcmToken) {
      const fcmMessage = {
        token: recipientFcmToken,
        notification: {
          title: `New message from ${message.sender.name}`,
          body: content,
        },
        data: {
          senderId: message.senderId,
          type: 'CHAT_MESSAGE',
        },
      };
      await admin.messaging().send(fcmMessage);
    }

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error while sending message' }, { status: 500 });
  }
}