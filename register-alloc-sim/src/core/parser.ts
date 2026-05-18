// ==========================================
// TAC Parser — Converts token stream to TACInstruction[]
// ==========================================

import type { Token, TACInstruction, TACOpType } from './types';

export class ParseError extends Error {
  constructor(
    public readonly line: number,
    message: string
  ) {
    super(`Parse error at line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}

export interface ParseResult {
  instructions: TACInstruction[];
  errors: ParseError[];
}

// ---- Helper: Is a string a constant? ----
function isConstant(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s);
}

// ---- Token cursor ----
class TokenStream {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', line: -1, col: -1 };
  }

  consume(): Token {
    return this.tokens[this.pos++] ?? { type: 'EOF', value: '', line: -1, col: -1 };
  }

  /** Skip COMMENT and NEWLINE tokens */
  skipTrivia(): void {
    while (
      this.pos < this.tokens.length &&
      (this.tokens[this.pos].type === 'COMMENT' || this.tokens[this.pos].type === 'NEWLINE')
    ) {
      this.pos++;
    }
  }

  atEnd(): boolean {
    this.skipTrivia();
    return this.peek().type === 'EOF';
  }
}

export function parse(tokens: Token[]): ParseResult {
  const stream = new TokenStream(tokens);
  const instructions: TACInstruction[] = [];
  const errors: ParseError[] = [];
  let id = 0;

  while (!stream.atEnd()) {
    stream.skipTrivia();
    const tok = stream.peek();

    if (tok.type === 'EOF') break;

    try {
      const instr = parseStatement(stream, id, errors);
      if (instr) {
        instructions.push(instr);
        id++;
      }
    } catch (e) {
      if (e instanceof ParseError) {
        errors.push(e);
        // Skip to next newline to recover
        while (!stream.atEnd() && stream.peek().type !== 'NEWLINE') {
          stream.consume();
        }
      } else {
        throw e;
      }
    }
  }

  return { instructions, errors };
}

function parseStatement(
  stream: TokenStream,
  id: number,
  _errors: ParseError[]
): TACInstruction | null {
  stream.skipTrivia();
  const first = stream.peek();

  if (first.type === 'EOF') return null;

  // ---- LABEL: identifier ':' ----
  if (first.type === 'IDENTIFIER') {
    // Check if next token is ':'
    const saved = { ...first };
    stream.consume();
    stream.skipTrivia();
    const next = stream.peek();

    if (next.type === 'COLON') {
      stream.consume(); // consume ':'
      return {
        id,
        op: 'label',
        target: saved.value,
        raw: `${saved.value}:`,
      };
    }

    // Otherwise it might be an assignment: var = ...
    if (next.type === 'ASSIGN') {
      stream.consume(); // consume '='
      return parseAssignRHS(stream, id, saved.value, saved.line);
    }

    throw new ParseError(first.line, `Unexpected token after identifier '${saved.value}': '${next.value}'`);
  }

  // ---- KEYWORD statements ----
  if (first.type === 'KEYWORD') {
    stream.consume();

    switch (first.value) {
      case 'goto': {
        stream.skipTrivia();
        const target = stream.consume();
        if (target.type !== 'IDENTIFIER') {
          throw new ParseError(first.line, `Expected label after 'goto', got '${target.value}'`);
        }
        return { id, op: 'goto', target: target.value, raw: `goto ${target.value}` };
      }

      case 'if': {
        // if <cond> goto <label>  — cond may be: var | var op var | var CMP var
        return parseIfGoto(stream, id, first.line, false);
      }

      case 'ifFalse': {
        return parseIfGoto(stream, id, first.line, true);
      }

      case 'param': {
        stream.skipTrivia();
        const arg = stream.consume();
        return { id, op: 'param', arg1: arg.value, raw: `param ${arg.value}` };
      }

      case 'call': {
        // call funcname, n
        stream.skipTrivia();
        const fn = stream.consume();
        stream.skipTrivia();
        if (stream.peek().type === 'COMMA') stream.consume();
        stream.skipTrivia();
        const n = stream.consume();
        return {
          id,
          op: 'call',
          arg1: fn.value,
          arg2: n.value,
          raw: `call ${fn.value}, ${n.value}`,
        };
      }

      case 'return': {
        stream.skipTrivia();
        const val = stream.peek();
        if (val.type === 'IDENTIFIER' || val.type === 'NUMBER') {
          stream.consume();
          return { id, op: 'return', arg1: val.value, raw: `return ${val.value}` };
        }
        return { id, op: 'return', raw: 'return' };
      }

      case 'label': {
        stream.skipTrivia();
        const lname = stream.consume();
        return { id, op: 'label', target: lname.value, raw: `label ${lname.value}` };
      }

      default:
        throw new ParseError(first.line, `Unknown keyword '${first.value}'`);
    }
  }

  // ---- OPERATOR prefix (e.g., dereference *var = ...) ----
  if (first.type === 'OPERATOR' && first.value === '*') {
    stream.consume();
    stream.skipTrivia();
    const varTok = stream.consume();
    stream.skipTrivia();
    if (stream.peek().type === 'ASSIGN') {
      stream.consume();
      stream.skipTrivia();
      const rhs = stream.consume();
      return {
        id,
        op: 'assign',
        result: `*${varTok.value}`,
        arg1: rhs.value,
        raw: `*${varTok.value} = ${rhs.value}`,
      };
    }
    throw new ParseError(first.line, `Expected '=' after '*${varTok.value}'`);
  }

  // Skip any unrecognized tokens
  stream.consume();
  return null;
}

// ---- Parse RHS of an assignment: result = <expr> ----
function parseAssignRHS(
  stream: TokenStream,
  id: number,
  result: string,
  line: number
): TACInstruction {
  stream.skipTrivia();
  const tok1 = stream.peek();

  // Dereference: result = *var
  if (tok1.type === 'OPERATOR' && tok1.value === '*') {
    stream.consume();
    stream.skipTrivia();
    const varTok = stream.consume();
    return {
      id,
      op: 'assign',
      result,
      arg1: `*${varTok.value}`,
      raw: `${result} = *${varTok.value}`,
    };
  }

  // Could be: call funcname, n
  if (tok1.type === 'KEYWORD' && tok1.value === 'call') {
    stream.consume();
    stream.skipTrivia();
    const fn = stream.consume();
    stream.skipTrivia();
    if (stream.peek().type === 'COMMA') stream.consume();
    stream.skipTrivia();
    const n = stream.consume();
    return {
      id,
      op: 'call',
      result,
      arg1: fn.value,
      arg2: n.value,
      raw: `${result} = call ${fn.value}, ${n.value}`,
    };
  }

  // First operand
  if (tok1.type !== 'IDENTIFIER' && tok1.type !== 'NUMBER') {
    throw new ParseError(line, `Expected operand after '=', got '${tok1.value}'`);
  }
  stream.consume();
  const arg1 = tok1.value;

  // Peek for binary operator or comparison
  stream.skipTrivia();
  const opTok = stream.peek();

  if (opTok.type === 'OPERATOR' || opTok.type === 'COMPARISON') {
    stream.consume();
    const opStr = opTok.value;
    stream.skipTrivia();
    const tok2 = stream.consume();
    const arg2 = tok2.value;

    const op = mapBinaryOp(opStr);
    return {
      id,
      op,
      result,
      arg1,
      arg2,
      raw: `${result} = ${arg1} ${opStr} ${arg2}`,
    };
  }

  // Simple copy: result = var
  return { id, op: 'assign', result, arg1, raw: `${result} = ${arg1}` };
}

// ---- Map operator string to TACOpType ----
function mapBinaryOp(op: string): TACOpType {
  switch (op) {
    case '+': return 'add';
    case '-': return 'sub';
    case '*': return 'mul';
    case '/': return 'div';
    case '%': return 'mod';
    case '<': return 'lt';
    case '>': return 'gt';
    case '==': return 'eq';
    case '!=': return 'neq';
    case '<=': return 'lt'; // simplified
    case '>=': return 'gt'; // simplified
    default: return 'assign';
  }
}

// ---- Parse: if/ifFalse <cond_var> [op var] goto <label> ----
function parseIfGoto(
  stream: TokenStream,
  id: number,
  line: number,
  isFalse: boolean
): TACInstruction {
  stream.skipTrivia();
  const condVar = stream.consume();
  if (condVar.type !== 'IDENTIFIER' && condVar.type !== 'NUMBER') {
    throw new ParseError(line, `Expected condition variable after 'if', got '${condVar.value}'`);
  }

  stream.skipTrivia();
  let compOp: string | null = null;
  let arg2: string | null = null;

  // Optional comparison: var OP var
  if (stream.peek().type === 'COMPARISON') {
    compOp = stream.consume().value;
    stream.skipTrivia();
    const rhs = stream.consume();
    arg2 = rhs.value;
    stream.skipTrivia();
  }

  // 'goto'
  const gotoTok = stream.peek();
  if (gotoTok.type === 'KEYWORD' && gotoTok.value === 'goto') {
    stream.consume();
  }

  stream.skipTrivia();
  const label = stream.consume();

  const op: TACOpType = isFalse ? 'iffalse_goto' : 'if_goto';

  let raw: string;
  if (compOp && arg2) {
    raw = `${isFalse ? 'ifFalse' : 'if'} ${condVar.value} ${compOp} ${arg2} goto ${label.value}`;
  } else {
    raw = `${isFalse ? 'ifFalse' : 'if'} ${condVar.value} goto ${label.value}`;
  }

  return {
    id,
    op,
    arg1: condVar.value,
    arg2: compOp && arg2 ? `${compOp}${arg2}` : undefined,
    target: label.value,
    raw,
  };
}
