import { TaskDetail } from "../../../../../components/planner/task-detail";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TaskDetail taskId={id} />;
}