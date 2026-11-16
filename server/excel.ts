import ExcelJS from "exceljs";
import { createHash } from "node:crypto";

export type DatasetType = "teorico" | "pratico";
export type Candidate = {
  candidateKey: string;
  matricula: string;
  prova: string;
  nome: string;
  genero: string | null;
  gerencia: string | null;
  coordenacao: string | null;
  turno: string | null;
  dataAplicacao: string | null;
  nota: number | null;
  resultado: string | null;
  objects: Record<string, number | null>;
  raw: Record<string, unknown>;
};
const clean = (v: unknown) => String(v ?? "").trim();
const scalar = (v: unknown): unknown => {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object") {
    const x = v as {
      text?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    return (
      x.text ?? x.result ?? x.richText?.map((r) => r.text).join("") ?? String(v)
    );
  }
  return v ?? null;
};
const normalizeHeader = (v: unknown) =>
  clean(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
const dateOnly = (v: unknown) => {
  if (v instanceof Date && !Number.isNaN(v.valueOf()))
    return v.toISOString().slice(0, 10);
  const text = clean(v);
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.valueOf())
    ? null
    : parsed.toISOString().slice(0, 10);
};
const numeric = (v: unknown) => {
  const n =
    typeof v === "number"
      ? v
      : Number(clean(v).replace(",", ".").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

export async function parseWorkbook(buffer: Buffer, type: DatasetType) {
  if (buffer.subarray(0, 2).toString("hex") !== "504b")
    throw new Error("O arquivo não é uma planilha XLSX válida.");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.getWorksheet("Geral - Objeto X Capacidade");
  if (!ws)
    throw new Error(
      'A guia obrigatória "Geral - Objeto X Capacidade" não foi encontrada.',
    );
  const headers = (ws.getRow(1).values as unknown[])
    .slice(1)
    .map(normalizeHeader);
  const find = (...names: string[]) =>
    headers.findIndex((h) => names.includes(h)) + 1;
  const cols = {
    prova: find("PROVA"),
    matricula: find("MATRICULA"),
    nome: find("NOME COMPLETO"),
    genero: find("GENERO"),
    gerencia: find("GERENCIA"),
    coordenacao: find("COORDENACAO"),
    turno: find("LETRA TURNO"),
    data: find("DATA APLICACAO"),
    nota: find("NOTA/100,00"),
    resultado: find("RESULTADO"),
  };
  if (!cols.prova || !cols.matricula || !cols.nome || !cols.nota)
    throw new Error(
      "A estrutura da planilha não corresponde ao modelo esperado.",
    );
  const objectCols = Object.fromEntries(
    Array.from({ length: 11 }, (_, i) => {
      const k = `O${i + 1}`;
      return [k, find(`% ${k}`)];
    }),
  );
  if (Object.values(objectCols).some((v) => !v))
    throw new Error(
      "A planilha deve conter os percentuais dos objetos O1 a O11.",
    );
  const candidates: Candidate[] = [];
  for (let rowNo = 2; rowNo <= ws.rowCount; rowNo++) {
    const row = ws.getRow(rowNo);
    const matricula = clean(scalar(row.getCell(cols.matricula).value));
    const prova = clean(scalar(row.getCell(cols.prova).value));
    // Registros sem prova representam participantes ainda pendentes de aplicação.
    // A matrícula é suficiente para preservá-los na base e nos indicadores.
    if (!matricula) continue;
    const raw: Record<string, unknown> = {};
    headers.forEach((h, i) => (raw[h] = scalar(row.getCell(i + 1).value)));
    const objects: Record<string, number | null> = {};
    for (const [key, col] of Object.entries(objectCols)) {
      const n = numeric(scalar(row.getCell(col).value));
      objects[key] = n !== null && Math.abs(n) <= 1 ? n * 100 : n;
    }
    candidates.push({
      candidateKey: `${matricula}::${prova}`.toLowerCase(),
      matricula,
      prova,
      nome: clean(scalar(row.getCell(cols.nome).value)) || matricula,
      genero: clean(scalar(row.getCell(cols.genero).value)) || null,
      gerencia: clean(scalar(row.getCell(cols.gerencia).value)) || null,
      coordenacao: clean(scalar(row.getCell(cols.coordenacao).value)) || null,
      turno: clean(scalar(row.getCell(cols.turno).value)) || null,
      dataAplicacao: dateOnly(row.getCell(cols.data).value),
      nota: numeric(scalar(row.getCell(cols.nota).value)),
      resultado: clean(scalar(row.getCell(cols.resultado).value)) || null,
      objects,
      raw,
    });
  }
  if (!candidates.length)
    throw new Error("Nenhum registro válido foi encontrado na planilha.");
  return {
    candidates,
    checksum: createHash("sha256").update(buffer).digest("hex"),
    type,
  };
}

export function compareCandidates(oldRows: Candidate[], nextRows: Candidate[]) {
  const oldMap = new Map(oldRows.map((r) => [r.candidateKey, r]));
  const newMap = new Map(nextRows.map((r) => [r.candidateKey, r]));
  const added: Candidate[] = [];
  const removed: Candidate[] = [];
  const changed: { key: string; nome: string; fields: string[] }[] = [];
  let unchanged = 0;
  for (const [key, row] of newMap) {
    const before = oldMap.get(key);
    if (!before) {
      added.push(row);
      continue;
    }
    const fields = [
      "nome",
      "genero",
      "gerencia",
      "coordenacao",
      "turno",
      "dataAplicacao",
      "nota",
      "resultado",
      "objects",
    ].filter(
      (f) =>
        JSON.stringify(before[f as keyof Candidate]) !==
        JSON.stringify(row[f as keyof Candidate]),
    );
    fields.length ? changed.push({ key, nome: row.nome, fields }) : unchanged++;
  }
  for (const [key, row] of oldMap) if (!newMap.has(key)) removed.push(row);
  return {
    added: added.map((r) => ({
      key: r.candidateKey,
      nome: r.nome,
      matricula: r.matricula,
    })),
    changed,
    removed: removed.map((r) => ({
      key: r.candidateKey,
      nome: r.nome,
      matricula: r.matricula,
    })),
    counts: {
      added: added.length,
      changed: changed.length,
      removed: removed.length,
      unchanged,
      total: nextRows.length,
    },
  };
}
