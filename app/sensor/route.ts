import { NextResponse } from 'next/server';

// Global variable to store the latest sensor data in memory.
// We use global so that it survives hot-reloads in development.
const globalAny: any = global;

if (!globalAny.sensorData) {
  globalAny.sensorData = null; // No initial data
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Save to global memory
    globalAny.sensorData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    console.log('Received sensor data:', globalAny.sensorData);
    
    return NextResponse.json({ success: true, message: 'Data received' });
  } catch (error) {
    console.error('Error processing sensor data:', error);
    return NextResponse.json({ success: false, error: 'Invalid JSON data' }, { status: 400 });
  }
}

export async function GET() {
  if (!globalAny.sensorData) {
    return NextResponse.json({ error: 'No data available yet' }, { status: 404 });
  }
  return NextResponse.json(globalAny.sensorData);
}
