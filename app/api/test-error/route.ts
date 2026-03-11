// app/api/test-error/route.ts
export async function GET() {
  throw new Error("Test error from PatternAligned");
}
