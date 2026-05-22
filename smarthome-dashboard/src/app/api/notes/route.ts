import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

const BASE = "https://keep.googleapis.com/v1/notes";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const res = await fetch(BASE, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: data.error?.message ?? "Failed to fetch notes" }, { status: res.status });
  }

  return Response.json(data.notes ?? []);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}