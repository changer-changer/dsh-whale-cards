// Compatibility re-export. Task notice ownership moved to the breakroom shell
// (spec §11); this module only re-exports the public types and hook so existing
// importers (client adapter, preview, companion) migrate without churn.

export {
  useTaskNotice,
  type TaskListSnapshot,
  type TaskListSource,
  type TaskNotice,
  type TaskSummary,
} from '../breakroom/task-status.ts'
