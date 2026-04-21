import fs from 'fs';
import path from 'path';
import { GateReport } from '../types';

export function persistGateReport(report: GateReport, gatesDir: string): string {
  fs.mkdirSync(gatesDir, { recursive: true });
  const filePath = path.join(gatesDir, `${report.phase}-gate.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}
