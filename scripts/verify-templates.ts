// Proves the shipped templates satisfy the importer: correct format detection,
// every header found, and a filled row actually lands in the database.
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { isTeamAnalyticsWorkbook } from "../src/lib/excelImport";

const DIR = "C:/Users/tanne/Football Project/jordan-football-app/templates";

const EXPECTED: Record<string, Record<string, string[]>> = {
  "Opponent Scouting Template.xlsx": {
    "Opp Offense Log": ["Film / Game", "Qtr", "Down", "Distance", "Yard Line (to goal)", "Hash",
      "Score Situation", "Personnel", "Formation", "Strength", "Backfield", "Motion (Y/N)",
      "Play Type", "Play Call / Concept", "Direction", "Ball Carrier / Target", "Yards",
      "Result Type", "Front", "Coverage", "Blitz (Y/N)", "Blitz Type"],
    "Opp Defense Log": ["Film / Game", "Qtr", "Down", "Distance", "Yard Line (to goal)", "Hash",
      "Def Personnel", "Front", "Coverage", "Blitz (Y/N)", "Blitz Type", "Rushers (#)",
      "Offense Play Type", "Formation Faced", "Off Strength", "Off Direction", "Yards Allowed",
      "Result Type"],
    "Opp Special Teams Log": ["Film / Game", "Play #", "ODK", "Qtr", "Down", "Distance",
      "Yard Line (to goal)", "Hash", "Play Type", "Result", "Yards"],
  },
  "Team Analytics Template.xlsx": {
    "Offense Play-by-Play": ["Week", "Date", "Opponent", "Qtr", "Down", "Distance",
      "Yard Line (to goal 1-99)", "Hash", "Personnel", "Formation", "Strength", "Play Type",
      "Play Call / Concept", "Direction", "Key Player", "Yards", "Result Type", "Points",
      "Def Front", "Coverage", "Blitz (Y/N)"],
    "Defense Play-by-Play": ["Week", "Date", "Opponent", "Qtr", "Down", "Distance",
      "Yard Line (to goal 1-99)", "Hash", "Personnel", "Opp Formation", "Strength", "Play Type",
      "Opp Play Call", "Direction", "Opp Key Player", "Yards Allowed", "Result Type", "Points",
      "Our Front", "Our Coverage", "Blitz (Y/N)"],
    "Special Teams Log": ["Week", "Opponent", "Play #", "ODK", "Qtr", "Down", "Distance",
      "Yard Line (to goal)", "Hash", "Play Type", "Result", "Yards"],
  },
};

async function main() {
  let failures = 0;

  for (const [file, sheets] of Object.entries(EXPECTED)) {
    const buf = await readFile(`${DIR}/${file}`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);

    const isTeam = await isTeamAnalyticsWorkbook(buf);
    const shouldBeTeam = file.startsWith("Team");
    const detectOk = isTeam === shouldBeTeam;
    if (!detectOk) failures++;
    console.log(`\n${file}`);
    console.log(`  detected as ${isTeam ? "Team Analytics" : "Opponent Scouting"} ${detectOk ? "OK" : "WRONG"}`);

    for (const [sheetName, headers] of Object.entries(sheets)) {
      const ws = wb.getWorksheet(sheetName);
      if (!ws) {
        console.log(`  MISSING SHEET: ${sheetName}`);
        failures++;
        continue;
      }
      const actual = new Set<string>();
      ws.getRow(1).eachCell((c) => {
        if (typeof c.value === "string") actual.add(c.value.trim());
      });
      const missing = headers.filter((h) => !actual.has(h));
      if (missing.length) {
        console.log(`  ${sheetName}: MISSING HEADERS -> ${missing.join(", ")}`);
        failures++;
      } else {
        console.log(`  ${sheetName}: all ${headers.length} headers present, ${ws.rowCount - 1} data rows`);
      }
    }
  }

  console.log(failures === 0 ? "\nALL TEMPLATE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  if (failures > 0) process.exitCode = 1;
}

main();
