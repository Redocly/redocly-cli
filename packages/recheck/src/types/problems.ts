import type { RuleSeverity } from './rules.js';

export interface Problem {
  file: string;
  line: number;
  column: number;
  text: string;
  match: string;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  fixable?: boolean;
  // JSON pointer of the description that holds the finding; unset for pages.
  pointer?: string;
}

export interface Fix {
  file: string;
  ruleName: string;
  lineNumber: number; // 1-based
  editColumn?: number; // 1-based, default 1
  deleteCount?: number; // chars to delete from editColumn; -1 = whole line
  insertText?: string; // text to insert at editColumn (or replacement line when deleteCount === -1)
}
