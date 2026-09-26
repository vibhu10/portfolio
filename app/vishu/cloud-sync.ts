import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function getHasExam() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('exams')
    .select('id,code,name')
    .eq('code', 'HAS')
    .single();

  return error ? null : data;
}

export async function signInStudyUser(
  email: string,
  password: string
) {
  if (!isSupabaseConfigured) {
    return {
      session: null,
      error: new Error('Supabase not configured'),
    };
  }

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  return {
    session: data.session,
    error,
  };
}

export async function saveQuestionAttempt(
  externalKey: string,
  selected: number,
  isCorrect: boolean,
  mode = 'practice'
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const exam = await getHasExam();

  if (!user || !exam) return;

  const { data: q } = await supabase
    .from('exam_questions')
    .select('id')
    .eq('exam_id', exam.id)
    .eq('external_key', externalKey)
    .maybeSingle();

  if (!q) return;

  await supabase
    .from('exam_question_attempts')
    .insert({
      user_id: user.id,
      exam_id: exam.id,
      question_id: q.id,
      selected_option: selected,
      is_correct: isCorrect,
      mode,
    });

  if (!isCorrect) {
    await supabase
      .from('exam_revision_items')
      .upsert(
        {
          user_id: user.id,
          exam_id: exam.id,
          question_id: q.id,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,question_id',
        }
      );
  }
}

export async function saveBookmark(
  externalKey: string,
  saved: boolean
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const exam = await getHasExam();

  if (!user || !exam) return;

  const { data: q } = await supabase
    .from('exam_questions')
    .select('id')
    .eq('exam_id', exam.id)
    .eq('external_key', externalKey)
    .maybeSingle();

  if (!q) return;

  if (saved) {
    await supabase
      .from('exam_bookmarks')
      .upsert(
        {
          user_id: user.id,
          exam_id: exam.id,
          question_id: q.id,
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
      .eq('question_id', q.id);
  }
}

export async function saveSettings(
  examDate: string,
  weeklyTarget: number,
  notes: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const exam = await getHasExam();

  if (!user || !exam) return;

  await supabase
    .from('exam_user_settings')
    .upsert(
      {
        user_id: user.id,
        exam_id: exam.id,
        exam_date: examDate || null,
        weekly_target: weeklyTarget,
        notes,
        updated_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,exam_id,note_type',
      }
    );
}

export async function saveActivity(
  date: string,
  count: number,
  tasks: Record<string, boolean> = {}
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const exam = await getHasExam();

  if (!user || !exam) return;

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
        onConflict:
          'user_id,exam_id,activity_date',
      }
    );
}
