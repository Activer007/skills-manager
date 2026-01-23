/**
 * 合集类型定义
 */

export interface Collection {
  id: string;
  name: string;
  description?: string;
  author?: string;
  icon?: string;
  color?: string;
  is_public: boolean;
  created_at: number;
  updated_at: number;
  items_count: number;
  items?: CollectionItem[];
}

export interface CollectionItem {
  id: number;
  collection_id: string;
  skill_id: string;
  skill_name: string;
  skill_path?: string;
  skill_identifier?: string;
  added_at: number;
  note?: string;
  sort_order: number;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  author?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_public?: boolean;
}

export interface AddItemRequest {
  collection_id: string;
  skill_id: string;
  skill_name: string;
  skill_path?: string;
  skill_identifier?: string;
  note?: string;
}

export interface RemoveItemRequest {
  collection_id: string;
  skill_id: string;
}

export interface ReorderItemsRequest {
  collection_id: string;
  item_ids: number[];
}
