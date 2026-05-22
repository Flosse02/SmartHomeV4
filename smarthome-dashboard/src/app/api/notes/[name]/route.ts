import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

const BASE = "https://keep.googleapis.com/v1";

export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const res = await fetch(`${BASE}/notes/${params.name}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: data.error?.message ?? "Failed to fetch notes" }, { status: res.status });
  }

  return Response.json(data, { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken)
    return Response.json({ error: "Not authenticated" }, { status: 401 });

  const res = await fetch(`${BASE}/notes/${params.name}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  return new Response(null, { status: res.status });
}