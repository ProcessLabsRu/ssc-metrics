export interface Process1 {
  level1_id: number;
  f1_index: string;
  f1_name: string;
  is_active: boolean | null;
  sort: number | null;
  note: string | null;
}

export interface Process2 {
  f2_index: string;
  f1_index: string | null;
  f2_name: string | null;
  is_active: boolean | null;
  sort: number | null;
  note: string | null;
}

export interface Process3 {
  f3_index: string;
  f2_index: string | null;
  f3_name: string | null;
  is_active: boolean | null;
  sort: number | null;
  note: string | null;
}

export interface Process4 {
  f4_index: string;
  f3_index: string | null;
  f4_name: string | null;
  is_active: boolean | null;
  sort: number | null;
  note: string | null;
}

export interface System {
  system_id: number;
  system_name: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserResponse {
  id: number;
  user_id: string | null;
  f4_index: string | null;
  system_id: number | null;
  notes: string | null;
  labor_hours: number | null;
  created_at: string;
  is_submitted?: boolean;
  submitted_at?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  invitation_sent_at?: string | null;
  last_sign_in_at?: string | null;
  questionnaire_completed?: boolean;
  questionnaire_completed_at?: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
}

export interface UserAccess {
  id: string;
  user_id: string;
  f1_index: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

