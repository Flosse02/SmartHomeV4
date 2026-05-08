import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function PATCH(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { eventId } = await params; // ← await it

  const body = await req.json();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { eventId } = await params;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }
  );

  // Google returns 204 No Content on success
  if (res.status === 204) {
    return new Response(null, { status: 204 });
  }

  const data = await res.json();
  return Response.json(data, { status: res.status });
}