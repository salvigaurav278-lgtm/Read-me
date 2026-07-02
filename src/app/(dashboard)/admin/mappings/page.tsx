import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MappingManager } from "@/components/admin/mapping-manager";

export const metadata = { title: "Chapter Mapping — Admin" };

export default async function AdminMappingsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");
  return <MappingManager />;
}
