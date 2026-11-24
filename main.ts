#!/usr/bin/env node
/**
 * Writes the entry for make.fun's "Two Days of Quiet Dread" bounty: one
 * code-review comment, a single line of at most 140 characters, that
 * approves a pull request while carrying quiet existential dread.
 *
 * The comment lives in entry.txt next to this file. This program reads it
 * relative to its own location (never the working directory), validates the
 * gate (one line, 1-140 UTF-8 characters, not only whitespace), writes it
 * to <OUTPUT_DIR>/entry.txt (default /output/entry.txt) for the harness,
 * verifies the write byte for byte, and prints the line.
 *
 * The dread is in the approval itself: the code will outlive the team, the
 * company, and eventually the language it is written in — and we ship it
 * anyway.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_LENGTH = 140;
const MIN_LENGTH = 1;

interface GateReport {
  characters: number;
  bytes: number;
  lines: number;
  ok: boolean;
}

function readEntry(): string {
  const dir = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(resolve(dir, "entry.txt"), "utf8");
  // entry.txt holds exactly one line; tolerate a single trailing newline.
  return raw.endsWith("\n") ? raw.slice(0, -1) : raw;
}

function gate(text: string): GateReport {
  const characters = Array.from(text).length;
  const bytes = Buffer.byteLength(text, "utf8");
  const lines = text.split(/\r\n|\r|\n/).length;
  const problems: string[] = [];
  if (characters < MIN_LENGTH) problems.push("empty");
  if (characters > MAX_LENGTH) {
    problems.push(`${characters} chars exceeds the ${MAX_LENGTH} cap`);
  }
  if (text.trim() === "") problems.push("whitespace only");
  if (lines !== 1) problems.push(`${lines} lines instead of one`);
  if (text !== text.trimEnd()) problems.push("trailing whitespace/newline");
  if (problems.length > 0) {
    console.error("gate failed:", problems.join("; "));
    process.exit(1);
  }
  return { characters, bytes, lines, ok: true };
}

function outputPath(): string {
  const dir = process.env.OUTPUT_DIR ?? "/output";
  mkdirSync(dir, { recursive: true });
  return resolve(dir, "entry.txt");
}

function run(): void {
  const line = readEntry();
  const report = gate(line);
  const path = outputPath();
  // Write the raw string: no trailing newline, it would count as a char.
  writeFileSync(path, line, "utf8");
  const roundTrip = readFileSync(path, "utf8");
  if (roundTrip !== line) {
    console.error("round-trip mismatch after write");
    process.exit(1);
  }
  gate(roundTrip);
  console.log(line);
  console.error(
    `entry written: ${report.characters} chars, ${report.bytes} bytes, ` +
      `${report.lines} line -> ${path}`,
  );
}

run();
