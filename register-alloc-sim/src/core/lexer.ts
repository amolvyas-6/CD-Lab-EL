// ==========================================
// TAC Lexer — Tokenizer for Three-Address Code
// ==========================================

import type { Token, TokenType } from './types';

const KEYWORDS = new Set(['goto', 'if', 'ifFalse', 'param', 'call', 'return', 'label']);
const COMPARISON_OPS = new Set(['==', '!=', '<=', '>=', '<', '>']);
const ARITHMETIC_OPS = new Set(['+', '-', '*', '/', '%']);

export class LexerError extends Error {
  constructor(
    public readonly line: number,
    public readonly col: number,
    message: string
  ) {
    super(`Lexer error at line ${line}, col ${col}: ${message}`);
    this.name = 'LexerError';
  }
}

export interface LexResult {
  tokens: Token[];
  errors: LexerError[];
}

export function tokenize(source: string): LexResult {
  const tokens: Token[] = [];
  const errors: LexerError[] = [];
  const lines = source.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let col = 0;

    while (col < line.length) {
      // Skip whitespace
      if (/\s/.test(line[col])) {
        col++;
        continue;
      }

      // Comments — '#' to end of line
      if (line[col] === '#') {
        const value = line.slice(col);
        tokens.push({ type: 'COMMENT', value, line: lineNum + 1, col: col + 1 });
        col = line.length;
        continue;
      }

      // Two-char comparison operators
      if (col + 1 < line.length && COMPARISON_OPS.has(line.slice(col, col + 2))) {
        const value = line.slice(col, col + 2);
        tokens.push({ type: 'COMPARISON', value, line: lineNum + 1, col: col + 1 });
        col += 2;
        continue;
      }

      // Single-char comparison operators
      if (COMPARISON_OPS.has(line[col])) {
        tokens.push({ type: 'COMPARISON', value: line[col], line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Assignment '='
      if (line[col] === '=') {
        tokens.push({ type: 'ASSIGN', value: '=', line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Arithmetic operators
      if (ARITHMETIC_OPS.has(line[col])) {
        tokens.push({ type: 'OPERATOR', value: line[col], line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Colon
      if (line[col] === ':') {
        tokens.push({ type: 'COLON', value: ':', line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Comma
      if (line[col] === ',') {
        tokens.push({ type: 'COMMA', value: ',', line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Dereference pointer '*'
      if (line[col] === '*') {
        tokens.push({ type: 'OPERATOR', value: '*', line: lineNum + 1, col: col + 1 });
        col++;
        continue;
      }

      // Number literals
      if (/\d/.test(line[col])) {
        let num = '';
        const startCol = col;
        while (col < line.length && /[\d.]/.test(line[col])) {
          num += line[col++];
        }
        tokens.push({ type: 'NUMBER', value: num, line: lineNum + 1, col: startCol + 1 });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(line[col])) {
        let ident = '';
        const startCol = col;
        while (col < line.length && /[\w]/.test(line[col])) {
          ident += line[col++];
        }
        const type: TokenType = KEYWORDS.has(ident) ? 'KEYWORD' : 'IDENTIFIER';
        tokens.push({ type, value: ident, line: lineNum + 1, col: startCol + 1 });
        continue;
      }

      // Unknown character — record error and skip
      errors.push(new LexerError(lineNum + 1, col + 1, `Unexpected character '${line[col]}'`));
      col++;
    }

    // Emit NEWLINE (helps parser track line boundaries)
    tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum + 1, col: line.length + 1 });
  }

  tokens.push({ type: 'EOF', value: '', line: lines.length + 1, col: 0 });
  return { tokens, errors };
}
