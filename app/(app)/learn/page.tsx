import { LearnWorkspace } from "@/components/learn/learn-workspace";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const params = await searchParams;
  const missionId = params.m ?? "m01";
  return <LearnWorkspace missionId={missionId} />;
}
