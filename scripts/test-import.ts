// One-off integration check: run the real Excel import pipeline against the
// actual CVdata1.xlsx workbook for a given opponent id.
// Usage: npx tsx scripts/test-import.ts <opponentId> <path-to-xlsx>
import { readFile } from "node:fs/promises";
import { importScoutingWorkbook } from "../src/lib/excelImport";

const [, , opponentId, filePath] = process.argv;

if (!opponentId || !filePath) {
  console.error("Usage: npx tsx scripts/test-import.ts <opponentId> <path-to-xlsx>");
  process.exit(1);
}

async function main() {
  const buffer = await readFile(filePath);
  const result = await importScoutingWorkbook(opponentId, buffer);
  console.log(JSON.stringify(result, null, 2));
}

main();
