export type ItemStatus = 'new' | 'in_progress' | 'done';

export interface Item {
  id: string;
  title: string;
  category: string;
  value: number;
  status: ItemStatus;
  created_at: string;
}

export interface NewItem {
  title: string;
  category: string;
  value: number;
  status?: ItemStatus;
}
