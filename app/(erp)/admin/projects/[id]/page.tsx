import { ProjectDetailPage } from "@/server/pages/project-detail-page";

export default async function AdminProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailPage projectId={id} />;
}
