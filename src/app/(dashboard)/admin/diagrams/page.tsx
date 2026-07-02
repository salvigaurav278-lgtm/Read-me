import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiagramCheck } from "@/components/admin/diagram-check";

export const metadata = { title: "Diagram Check — Admin" };

export default async function AdminDiagramsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");
  return <DiagramCheck />;
}
