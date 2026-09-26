import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Admin endpoint to verify/approve a vehicle
export async function POST(request: Request) {
  try {
    const { vehicleId, adminRole, isVerified } = await request.json();

    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'Vehicle ID is required' }, { status: 400 });
    }

    // Basic role-based access check (in production, verify JWT token/session)
    if (adminRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    // Update vehicle availability or verification status
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isAvailable: isVerified ?? true },
    });

    return NextResponse.json({
      success: true,
      message: 'Vehicle verification status updated successfully',
      vehicle: updatedVehicle,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update vehicle verification status' }, { status: 500 });
  }
}