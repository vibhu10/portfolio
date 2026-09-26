import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Q } from './data';

type SimpleTasks = Record<string, boolean>;

export type CloudProgress = {
  attempts: number;
  correct: number;
  topics: Record<string, { a: number; c: number }>;
  done: string[];
  mocks: { date: string; kind: string; score: number }[];
  bookmarks: string[];
  review: string[];
  notes: string;
  activity: Record<string, number>;
  daily: Record<string, SimpleTasks>;
  examDate: string;
  weeklyTarget: number;
  hasSettings: boolean;
  hasCloudData: boolean;
};

type MockAnswerInput = {
  externalKey: string;
  selected: number | null;
  correctOption: number;
};

async function getContext() {
  if (!isSupabaseConfigured) return null;

  const [{ data: userData }, exam] = await Promise.all([
    supabase.auth.getUser(),
    getHasExam(),
  ]);

  if (!userData.user || !exam) return null;
  return { user: userData.user, exam };
}

async function questionIdFor(examId: string, externalKey: string) {
  const { data } = await supabase
    .from('exam_questions')
    .select('id')
    .eq('exam_id', examId)
    .eq('external_key', externalKey)
    .maybeSingle();

  return data?.id as string | undefined;
}

export async function getHasExam() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('exams')
    .select('id,code,name')
    .eq('code', 'HAS')
    .single();

  return error ? null : data;
}

export async function loadQuestionBank(): Promise<Q[]> {
  const exam = await getHasExam();
  if (!exam) return [];

  const [questionResult, sectionResult, topicResult] = await Promise.all([
    supabase
      .from('exam_questions')
      .select('id,section_id,topic_id,external_key,question_text,options,correct_option,explanation,takeaway,source_year,source_type')
      .eq('exam_id', exam.id)
      .eq('active', true)
      .not('correct_option', 'is', null)
      .order('source_year', { ascending: false, nullsFirst: false })
      .order('external_key', { ascending: true }),
    supabase
      .from('exam_sections')
      .select('id,code')
      .eq('exam_id', exam.id),
    supabase
      .from('exam_topics')
      .select('id,name')
      .eq('exam_id', exam.id),
  ]);

  if (questionResult.error) return [];

  const sectionById = new Map(
    (sectionResult.data || []).map((row: any) => [row.id, row.code] as const)
  );
  const topicById = new Map(
    (topicResult.data || []).map((row: any) => [row.id, row.name] as const)
  );

  return (questionResult.data || []).map((row: any) => {
    const answer = Number(row.correct_option);
    const year = row.source_year ? Number(row.source_year) : undefined;
    const sourceType = String(row.source_type || 'practice');

    return {
      id: String(row.external_key),
      kind: sectionById.get(row.section_id) === 'GSAT' ? 'GSAT' : 'GS',
      topic: topicById.get(row.topic_id) || 'General Studies',
      q: String(row.question_text),
      o: Array.isArray(row.options) ? row.options.map(String) : [],
      a: answer,
      why:
        String(row.explanation || '') ||
        (sourceType === 'pyq'
          ? 'Answer key option: ' + String.fromCharCode(65 + answer) + '.'
          : 'Review the correct option and the underlying concept.'),
      tip:
        String(row.takeaway || '') ||
        (year ? 'HPAS previous year question · ' + year : 'Syllabus practice question'),
      year,
      sourceType,
    } satisfies Q;
  }).filter((q: Q) => q.o.length >= 2);
}

export async function signInStudyUser(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return {
      session: null,
      error: new Error('Supabase not configured'),
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    session: data.session,
    error,
  };
}

export async function loadHasProgress(): Promise<CloudProgress | null> {
  const ctx = await getContext();
  if (!ctx) return null;

  const { user, exam } = ctx;

  const [
    questionResult,
    topicResult,
    settingsResult,
    noteResult,
    attemptsResult,
    bookmarksResult,
    revisionResult,
    syllabusResult,
    activityResult,
    mocksResult,
  ] = await Promise.all([
    supabase
      .from('exam_questions')
      .select('id,external_key,topic_id')
      .eq('exam_id', exam.id)
      .eq('active', true),
    supabase
      .from('exam_topics')
      .select('id,name')
      .eq('exam_id', exam.id),
    supabase
      .from('exam_user_settings')
      .select('exam_date,weekly_target,notes')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .maybeSingle(),
    supabase
      .from('exam_notes')
      .select('body')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .eq('note_type', 'quick')
      .maybeSingle(),
    supabase
      .from('exam_question_attempts')
      .select('question_id,is_correct,mode')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .eq('mode', 'practice'),
    supabase
      .from('exam_bookmarks')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id),
    supabase
      .from('exam_revision_items')
      .select('question_id,status')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .eq('status', 'pending'),
    supabase
      .from('exam_syllabus_progress')
      .select('syllabus_key,completed')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .eq('completed', true),
    supabase
      .from('exam_daily_activity')
      .select('activity_date,activity_count,task_state')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id),
    supabase
      .from('exam_mock_attempts')
      .select('paper_kind,score,started_at,submitted_at')
      .eq('user_id', user.id)
      .eq('exam_id', exam.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(20),
  ]);

  const questionRows = questionResult.data || [];
  const topicRows = topicResult.data || [];

  const topicNameById = new Map(
    topicRows.map((row: any) => [row.id, row.name] as const)
  );

  const questionById = new Map(
    questionRows.map((row: any) => [
      row.id,
      {
        externalKey: row.external_key as string,
        topic: topicNameById.get(row.topic_id) || 'Other',
      },
    ] as const)
  );

  const topics: Record<string, { a: number; c: number }> = {};
  let correct = 0;

  for (const attempt of attemptsResult.data || []) {
    const q = questionById.get((attempt as any).question_id);
    if (!q) continue;
    const current = topics[q.topic] || { a: 0, c: 0 };
    current.a += 1;
    if ((attempt as any).is_correct) {
      current.c += 1;
      correct += 1;
    }
    topics[q.topic] = current;
  }

  const bookmarks = (bookmarksResult.data || [])
    .map((row: any) => questionById.get(row.question_id)?.externalKey)
    .filter(Boolean) as string[];

  const review = (revisionResult.data || [])
    .map((row: any) => questionById.get(row.question_id)?.externalKey)
    .filter(Boolean) as string[];

  const activity: Record<string, number> = {};
  const daily: Record<string, SimpleTasks> = {};

  for (const row of activityResult.data || []) {
    const date = String((row as any).activity_date);
    activity[date] = Number((row as any).activity_count || 0);
    daily[date] = ((row as any).task_state || {}) as SimpleTasks;
  }

  const hasSettings = Boolean(settingsResult.data);
  const settings: any = settingsResult.data || {};
  const note: any = noteResult.data || {};

  const mocks = (mocksResult.data || []).map((row: any) => ({
    date: String(row.submitted_at || row.started_at),
    kind: String(row.paper_kind),
    score: Number(row.score || 0),
  }));

  const hasCloudData = Boolean(
    hasSettings ||
    (attemptsResult.data || []).length ||
    bookmarks.length ||
    review.length ||
    (syllabusResult.data || []).length ||
    (activityResult.data || []).length ||
    mocks.length ||
    noteResult.data
  );

  return {
    attempts: (attemptsResult.data || []).length,
    correct,
    topics,
    done: (syllabusResult.data || []).map((row: any) => String(row.syllabus_key)),
    mocks,
    bookmarks,
    review,
    notes: String(settings.notes || note.body || ''),
    activity,
    daily,
    examDate: settings.exam_date ? String(settings.exam_date) : '',
    weeklyTarget: Number(settings.weekly_target || 35),
    hasSettings,
    hasCloudData,
  };
}

export async function saveQuestionAttempt(
  externalKey: string,
  selected: number,
  isCorrect: boolean,
  mode = 'practice'
) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const questionId = await questionIdFor(exam.id, externalKey);
  if (!questionId) return;

  const { error } = await supabase
    .from('exam_question_attempts')
    .insert({
      user_id: user.id,
      exam_id: exam.id,
      question_id: questionId,
      selected_option: selected,
      is_correct: isCorrect,
      mode,
    });

  if (error) return;

  if (!isCorrect) {
    await supabase
      .from('exam_revision_items')
      .upsert(
        {
          user_id: user.id,
          exam_id: exam.id,
          question_id: questionId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,question_id',
        }
      );
  }
}

export async function saveBookmark(externalKey: string, saved: boolean) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const questionId = await questionIdFor(exam.id, externalKey);
  if (!questionId) return;

  if (saved) {
    await supabase
      .from('exam_bookmarks')
      .upsert(
        {
          user_id: user.id,
          exam_id: exam.id,
          question_id: questionId,
        },
        {
          onConflict: 'user_id,question_id',
        }
      );
  } else {
    await supabase
      .from('exam_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId);
  }
}

export async function saveSyllabusProgress(
  syllabusKey: string,
  completed: boolean
) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const now = new Date().toISOString();

  await supabase
    .from('exam_syllabus_progress')
    .upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        syllabus_key: syllabusKey,
        stage: syllabusKey.startsWith('m') ? 'mains' : 'prelims',
        completed,
        completed_at: completed ? now : null,
        updated_at: now,
      },
      {
        onConflict: 'user_id,exam_id,syllabus_key',
      }
    );
}

export async function markRevisionReviewed(externalKey: string) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const questionId = await questionIdFor(exam.id, externalKey);
  if (!questionId) return;

  const { data: current } = await supabase
    .from('exam_revision_items')
    .select('review_count')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle();

  await supabase
    .from('exam_revision_items')
    .update({
      status: 'reviewed',
      review_count: Number((current as any)?.review_count || 0) + 1,
      last_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('exam_id', exam.id)
    .eq('question_id', questionId);
}

export async function saveSettings(
  examDate: string,
  weeklyTarget: number,
  notes: string
) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const now = new Date().toISOString();

  await supabase
    .from('exam_user_settings')
    .upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        exam_date: examDate || null,
        weekly_target: weeklyTarget,
        notes,
        last_opened_at: now,
        updated_at: now,
      },
      {
        onConflict: 'user_id,exam_id',
      }
    );

  await supabase
    .from('exam_notes')
    .upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        note_type: 'quick',
        title: 'Quick notes',
        body: notes,
        updated_at: now,
      },
      {
        onConflict: 'user_id,exam_id,note_type',
      }
    );
}

export async function saveActivity(
  date: string,
  count: number,
  tasks: SimpleTasks = {}
) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;

  await supabase
    .from('exam_daily_activity')
    .upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        activity_date: date,
        activity_count: count,
        task_state: tasks,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,exam_id,activity_date',
      }
    );
}

export async function saveMockAttempt(
  kind: string,
  score: number,
  answers: MockAnswerInput[]
) {
  const ctx = await getContext();
  if (!ctx) return;

  const { user, exam } = ctx;
  const correctCount = answers.filter(
    item => item.selected !== null && item.selected === item.correctOption
  ).length;
  const wrongCount = answers.filter(
    item => item.selected !== null && item.selected !== item.correctOption
  ).length;
  const unansweredCount = answers.length - correctCount - wrongCount;
  const now = new Date().toISOString();

  const { data: mock, error } = await supabase
    .from('exam_mock_attempts')
    .insert({
      user_id: user.id,
      exam_id: exam.id,
      paper_kind: kind,
      score,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      total_questions: answers.length,
      submitted_at: now,
    })
    .select('id')
    .single();

  if (error || !mock) return;

  const keys = answers.map(item => item.externalKey);
  const { data: questionRows } = await supabase
    .from('exam_questions')
    .select('id,external_key')
    .eq('exam_id', exam.id)
    .in('external_key', keys);

  const ids = new Map(
    (questionRows || []).map((row: any) => [row.external_key, row.id] as const)
  );

  const rows = answers
    .map(item => {
      const questionId = ids.get(item.externalKey);
      if (!questionId) return null;
      return {
        mock_attempt_id: mock.id,
        user_id: user.id,
        question_id: questionId,
        selected_option: item.selected,
        is_correct:
          item.selected === null ? null : item.selected === item.correctOption,
      };
    })
    .filter(Boolean);

  if (rows.length) {
    await supabase.from('exam_mock_answers').insert(rows as any[]);
  }
}

export async function syncSimpleSnapshot(snapshot: {
  bookmarks: string[];
  done: string[];
  notes: string;
  examDate: string;
  weeklyTarget: number;
  activity: Record<string, number>;
  daily: Record<string, SimpleTasks>;
}) {
  const jobs: Promise<any>[] = [];

  for (const id of snapshot.bookmarks) {
    jobs.push(saveBookmark(id, true));
  }

  for (const key of snapshot.done) {
    jobs.push(saveSyllabusProgress(key, true));
  }

  for (const [date, count] of Object.entries(snapshot.activity)) {
    jobs.push(saveActivity(date, count, snapshot.daily[date] || {}));
  }

  jobs.push(
    saveSettings(snapshot.examDate, snapshot.weeklyTarget, snapshot.notes)
  );

  await Promise.all(jobs);
}
