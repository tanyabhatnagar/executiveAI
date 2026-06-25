export type ProjectStatus = 'Draft' | 'Running' | 'Completed';

export interface User {
  id: string;
  full_name: string;
  email: string;
  credits: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  goal: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}
