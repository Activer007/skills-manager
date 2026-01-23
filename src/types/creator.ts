export interface Creator {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  website_url?: string;
  skill_count: number;
  verified: boolean;
  created_at: number;
  updated_at: number;
  is_followed: boolean;
}

export interface UpdateCreatorRequest {
  id: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  website_url?: string;
}
