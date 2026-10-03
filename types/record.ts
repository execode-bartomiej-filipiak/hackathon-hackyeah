export interface RecordItem {
  id: string;
  name: string;
  category: string;
  value: number;
  status: 'active' | 'pending' | 'completed';
  created_at: string;
}

export type CreateRecordInput = Omit<RecordItem, 'id' | 'created_at'>;
