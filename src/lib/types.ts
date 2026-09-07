import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

type ColumnType = 'text' | 'number' | 'currency' | 'date' | 'enum' | 'boolean';
type SemanticTone = 'neutral' | 'positive' | 'warning' | 'critical';
type ActionVariant = 'primary' | 'destructive' | 'secondary' | 'outline';

// Helper to infer row type from Drizzle table
type InferRow<TTable extends SQLiteTable> = TTable extends { $inferSelect: infer T } 
  ? T 
  : never;

export interface ColumnConfig<TTable extends SQLiteTable = any> {
  key: keyof InferRow<TTable>;
  label: string;
  type: ColumnType;
  pii?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  enumOptions?: Array<{
    value: string;
    label: string;
    tone: SemanticTone;
  }>;
}

export interface ActionInputField {
  key: string;
  label: string;
  type: ColumnType;
  required?: boolean;
}

export interface RowAction<TTable extends SQLiteTable = any> {
  key: string;
  label: string;
  variant: ActionVariant;
  requiresApproval?: boolean | ((row: InferRow<TTable>) => boolean);
  inputFields?: ActionInputField[];
}

export interface FieldGroup {
  label: string;
  fields: string[]; // column keys
}

export interface RoleRequirements {
  view: string[]; // role names
  act: string[];  // role names
  approve: string[]; // role names
}

export interface DefaultViewState {
  defaultSort: {
    column: string;
    direction: 'asc' | 'desc';
  };
  defaultFilters?: Record<string, unknown>;
}

export interface AppConfig<TTable extends SQLiteTable = any> {
  slug: string;
  title: string;
  tableName: string;
  schema: TTable;
  titleField: keyof InferRow<TTable>;
  columns: ColumnConfig<TTable>[];
  rowActions: RowAction<TTable>[];
  detailFields: FieldGroup[];
  roles: RoleRequirements;
  viewState: DefaultViewState;
}