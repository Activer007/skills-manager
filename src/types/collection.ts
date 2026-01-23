export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  items?: CollectionItem[];
  itemsCount?: number;
}

export interface CollectionItem {
  collectionId: string;
  skillIdentifier: string;
  addedAt: number;
  note?: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface AddItemRequest {
  collectionId: string;
  skillIdentifier: string;
  note?: string;
}
