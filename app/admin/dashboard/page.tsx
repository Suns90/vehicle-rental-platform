'use client';

import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const [vehiclesRes, bookingsRes] = await Promise.all([
          fetch('/api/vehicles'),
          fetch('/api/bookings')
        ]);

        const vehiclesData = await vehiclesRes.json();
        const bookingsData = await bookingsRes.json();

        if (vehiclesData.success) setVehicles(vehiclesData.vehicles);
        if (bookingsData.success) setBookings(bookingsData.bookings);
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-lg font-medium text-gray-600">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Rental Platform - Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage fleet inventory, monitor bookings, and oversee operations.</p>
        </header>

        {/* Metrics Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Vehicles</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{vehicles.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Rentals</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {bookings.filter((b) => b.status === 'CONFIRMED').length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Pending Approvals</h3>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {bookings.filter((b) => b.status === 'PENDING').length}
            </p>
          </div>
        </div>

        {/* Fleet Inventory Table */}
        <div className="mb-8 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">Fleet Inventory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">License Plate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Daily Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.licensePlate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{vehicle.dailyRate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${vehicle.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vehicle.isAvailable ? 'Available' : 'Rented'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}