import type { Db } from '../opfs';

export interface StoredMilestone {
  id: string;
  goalId: string;
  weekIndex: number;
  title: string;
  targetDate: string | null;
  definitionOfDone: string;
  done: boolean;
  completedAt: string | null;
}

export interface StoredGoal {
  id: string;
  createdAt: string;
  horizon: 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  title: string;
  why: string | null;
  status: 'active' | 'paused' | 'achieved' | 'abandoned';
  decomposedAt: string | null;
  modelId: string | null;
  dailyTemplates: string[];
  risks: string[];
  firstWeekFocus: string | null;
  milestones: StoredMilestone[];
}

export interface CreateGoalInput {
  id: string;
  horizon: StoredGoal['horizon'];
  startDate: string;
  endDate: string;
  title: string;
  why?: string;
}

export interface DecompositionInput {
  decomposedAt: string;
  modelId: string;
  dailyTemplates: string[];
  risks: string[];
  firstWeekFocus: string;
  milestones: Array<{
    id: string;
    weekIndex: number;
    title: string;
    targetDate?: string | null;
    definitionOfDone: string;
  }>;
}

export interface GoalsRepo {
  create(input: CreateGoalInput, now: string): Promise<void>;
  update(
    id: string,
    patch: Partial<Pick<StoredGoal, 'title' | 'why' | 'status' | 'endDate' | 'horizon'>>,
  ): Promise<void>;
  remove(id: string): Promise<void>;
  get(id: string): Promise<StoredGoal | null>;
  list(status?: StoredGoal['status']): Promise<StoredGoal[]>;
  /** Replaces any previous decomposition for the goal. */
  saveDecomposition(goalId: string, input: DecompositionInput): Promise<void>;
  setMilestoneDone(milestoneId: string, done: boolean, at: string): Promise<void>;
}

function toGoal(r: Array<unknown>, milestones: StoredMilestone[]): StoredGoal {
  return {
    id: r[0] as string,
    createdAt: r[1] as string,
    horizon: r[2] as StoredGoal['horizon'],
    startDate: r[3] as string,
    endDate: r[4] as string,
    title: r[5] as string,
    why: (r[6] as string | null) ?? null,
    status: r[7] as StoredGoal['status'],
    decomposedAt: (r[8] as string | null) ?? null,
    modelId: (r[9] as string | null) ?? null,
    dailyTemplates: JSON.parse((r[10] as string) || '[]') as string[],
    risks: JSON.parse((r[11] as string) || '[]') as string[],
    firstWeekFocus: (r[12] as string | null) ?? null,
    milestones,
  };
}

const GOAL_COLS = `id, created_at, horizon, start_date, end_date, title, why, status,
                   decomposed_at, model_id, daily_templates, risks, first_week_focus`;

export function createGoalsRepo(db: Db): GoalsRepo {
  function milestonesFor(goalId: string): StoredMilestone[] {
    const rows = db.exec({
      sql: `SELECT id, goal_id, week_index, title, target_date, definition_of_done, done, completed_at
            FROM milestones WHERE goal_id = ? ORDER BY week_index ASC`,
      bind: [goalId],
      returnValue: 'resultRows',
    }) as Array<Array<unknown>>;
    return rows.map((m) => ({
      id: m[0] as string,
      goalId: m[1] as string,
      weekIndex: m[2] as number,
      title: m[3] as string,
      targetDate: (m[4] as string | null) ?? null,
      definitionOfDone: (m[5] as string) ?? '',
      done: m[6] === 1,
      completedAt: (m[7] as string | null) ?? null,
    }));
  }

  return {
    async create(input, now) {
      db.exec({
        sql: `INSERT INTO goals (id, created_at, horizon, start_date, end_date, title, why, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        bind: [
          input.id,
          now,
          input.horizon,
          input.startDate,
          input.endDate,
          input.title,
          input.why ?? null,
        ],
      });
    },

    async update(id, patch) {
      const sets: string[] = [];
      const bind: Array<string | number | null> = [];
      const map: Record<string, string> = {
        title: 'title',
        why: 'why',
        status: 'status',
        endDate: 'end_date',
        horizon: 'horizon',
      };
      for (const [key, column] of Object.entries(map)) {
        const value = (patch as Record<string, unknown>)[key];
        if (value === undefined) continue;
        sets.push(`${column} = ?`);
        bind.push(value as string | null);
      }
      if (sets.length === 0) return;
      bind.push(id);
      db.exec({ sql: `UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, bind });
    },

    async remove(id) {
      db.exec({ sql: 'DELETE FROM milestones WHERE goal_id = ?', bind: [id] });
      db.exec({ sql: 'DELETE FROM goals WHERE id = ?', bind: [id] });
    },

    async get(id) {
      const rows = db.exec({
        sql: `SELECT ${GOAL_COLS} FROM goals WHERE id = ?`,
        bind: [id],
        returnValue: 'resultRows',
      }) as Array<Array<unknown>>;
      if (!rows[0]) return null;
      return toGoal(rows[0], milestonesFor(id));
    },

    async list(status) {
      const rows = (
        status
          ? db.exec({
              sql: `SELECT ${GOAL_COLS} FROM goals WHERE status = ? ORDER BY end_date ASC`,
              bind: [status],
              returnValue: 'resultRows',
            })
          : db.exec({
              sql: `SELECT ${GOAL_COLS} FROM goals ORDER BY end_date ASC`,
              returnValue: 'resultRows',
            })
      ) as Array<Array<unknown>>;
      return rows.map((r) => toGoal(r, milestonesFor(r[0] as string)));
    },

    async saveDecomposition(goalId, input) {
      db.exec({
        sql: `UPDATE goals
              SET decomposed_at = ?, model_id = ?, daily_templates = ?, risks = ?,
                  first_week_focus = ?
              WHERE id = ?`,
        bind: [
          input.decomposedAt,
          input.modelId,
          JSON.stringify(input.dailyTemplates),
          JSON.stringify(input.risks),
          input.firstWeekFocus,
          goalId,
        ],
      });

      // A re-decomposition supersedes the old plan entirely; keeping the old
      // milestones would interleave two different plans on the same timeline.
      db.exec({ sql: 'DELETE FROM milestones WHERE goal_id = ?', bind: [goalId] });
      for (const m of input.milestones) {
        db.exec({
          sql: `INSERT INTO milestones
                  (id, goal_id, week_index, title, target_date, definition_of_done)
                VALUES (?, ?, ?, ?, ?, ?)`,
          bind: [m.id, goalId, m.weekIndex, m.title, m.targetDate ?? null, m.definitionOfDone],
        });
      }
    },

    async setMilestoneDone(milestoneId, done, at) {
      db.exec({
        sql: 'UPDATE milestones SET done = ?, completed_at = ? WHERE id = ?',
        bind: [done ? 1 : 0, done ? at : null, milestoneId],
      });
    },
  };
}
