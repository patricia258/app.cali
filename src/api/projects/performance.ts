import { supabase } from '../supabase';

export type DeliveryPerformance = {
  deliverable_id: string;
  project_id: string;
  protocol?: string | null;
  title: string;
  status: string;
  work_closed_at?: string | null;
  planned_start_date?: string | null;
  actual_started_at?: string | null;
  original_due_at?: string | null;
  effective_due_at?: string | null;
  approved_at?: string | null;
  completion_at?: string | null;
  delivery_timing: 'before_deadline' | 'on_time' | 'after_deadline' | 'open';
  business_days_from_deadline?: number | null;
  start_timing: 'started_early' | 'started_on_time' | 'started_late' | 'unknown';
  total_minutes: number;
};

export async function readProjectPerformance(projectId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.from('deliverable_delivery_performance').select('*')
    .eq('project_id', projectId).abortSignal(signal).returns<DeliveryPerformance[]>();
  if (error) throw error;
  return data ?? [];
}
