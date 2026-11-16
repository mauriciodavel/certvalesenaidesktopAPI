import type { RowDataPacket } from "mysql2";
import { rows } from "./db.js";

type ResultRow = RowDataPacket & {
  dataset_type: "teorico" | "pratico";
  candidate_key: string;
  matricula: string;
  prova: string;
  nome: string;
  genero: string | null;
  gerencia: string | null;
  coordenacao: string | null;
  turno: string | null;
  data_aplicacao: string | null;
  nota: number | null;
  resultado: string | null;
  objects_json: string | Record<string, number | null>;
  raw_json: string | Record<string, unknown>;
};
const pct = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
export async function dashboardData() {
  const result = await rows<ResultRow[]>(
    `SELECT r.* FROM candidate_results r JOIN dataset_versions v ON v.id=r.version_id WHERE v.is_active=TRUE ORDER BY r.nome`,
  );
  const normalized = result.map((r) => ({
    ...r,
    objects:
      typeof r.objects_json === "string"
        ? JSON.parse(r.objects_json)
        : r.objects_json,
    raw: typeof r.raw_json === "string" ? JSON.parse(r.raw_json) : r.raw_json,
  }));
  const theoretical = normalized.filter((r) => r.dataset_type === "teorico");
  const practical = normalized.filter((r) => r.dataset_type === "pratico");
  const summarize = (list: typeof normalized) => ({
    count: list.length,
    average: pct(
      list.map((r) => r.nota).filter((n): n is number => n !== null),
    ),
    approved: list.filter((r) =>
      String(r.resultado).toLowerCase().includes("aprov"),
    ).length,
    objects: Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => {
        const k = `O${i + 1}`;
        return [
          k,
          pct(
            list
              .map((r) => r.objects[k])
              .filter((n): n is number => n !== null),
          ),
        ];
      }),
    ),
  });
  const baseSummary = (items: typeof normalized) => ({
    ...summarize(items),
    total: items.length,
  });
  const tMap = new Map<string, (typeof theoretical)[number]>();
  for (const record of theoretical) {
    const prior = tMap.get(record.matricula);
    if (
      !prior ||
      String(record.data_aplicacao ?? "") > String(prior.data_aplicacao ?? "")
    )
      tMap.set(record.matricula, record);
  }
  const matched = practical.filter((r) => tMap.has(r.matricula));
  const candidates = matched.map((p) => {
    const t = tMap.get(p.matricula)!;
    return {
      matricula: p.matricula,
      nome: p.nome,
      genero: p.genero,
      gerencia: p.gerencia,
      turno: p.turno,
      prova: p.prova,
      teorica: t.nota,
      pratica: p.nota,
      gap: (p.nota ?? 0) - (t.nota ?? 0),
      status:
        String(t.resultado).toLowerCase().includes("aprov") &&
        String(p.resultado).toLowerCase().includes("aprov")
          ? "Aprovado"
          : "Reprovado",
    };
  });
  const asNumber = (value: unknown) => {
    const n =
      typeof value === "number"
        ? value
        : Number(
            String(value ?? "")
              .replace(",", ".")
              .replace("%", ""),
          );
    return Number.isFinite(n) ? n : null;
  };
  const percent = (value: unknown) => {
    const n = asNumber(value);
    return n === null ? null : Math.abs(n) <= 1 ? n * 100 : n;
  };
  const publicRecord = (r: (typeof normalized)[number]) => ({
    candidateKey: r.candidate_key,
    matricula: r.matricula,
    prova: r.prova,
    nome: r.nome,
    genero: r.genero,
    gerencia: r.gerencia,
    coordenacao: r.coordenacao,
    turno: r.turno,
    dataAplicacao: r.data_aplicacao,
    nota: r.nota,
    resultado: r.resultado,
    objects: r.objects,
    lider: String(r.raw.LIDER ?? "").trim() || null,
    cargo: String(r.raw.CARGO ?? "").trim() || null,
    idade: Number(r.raw.IDADE) || null,
    admissao: String(r.raw.ADMISSAO ?? "").trim() || null,
    tempo: asNumber(r.raw.TEMPO),
    situacao: String(r.raw.SITUACAO ?? "").trim() || null,
    aplicador: String(r.raw.APLICADOR ?? "").trim() || null,
    difficulty: {
      facil: {
        points: asNumber(r.raw["FACIL/18,00"]),
        percent: percent(r.raw["% FACIL"]),
      },
      medio: {
        points: asNumber(r.raw["MEDIO/52,00"]),
        percent: percent(r.raw["% MEDIO"]),
      },
      dificil: {
        points: asNumber(r.raw["DIFICIL/30,00"]),
        percent: percent(r.raw["% DIFICIL"]),
      },
    },
    scenarios: {
      cenario1: percent(r.raw["% CEN1"]),
      cenario2: percent(r.raw["% CEN2"]),
      cenario3: percent(r.raw["% CEN3"]),
      cenario4: percent(r.raw["% CEN4"]),
    },
  });
  return {
    theoretical: baseSummary(theoretical),
    practical: baseSummary(practical),
    records: {
      theoretical: theoretical.map(publicRecord),
      practical: practical.map(publicRecord),
    },
    gap: {
      matched: matched.length,
      average: pct(candidates.map((c) => c.gap)),
      approvedBoth: candidates.filter((c) => c.status === "Aprovado").length,
      objects: Object.fromEntries(
        Array.from({ length: 11 }, (_, i) => {
          const k = `O${i + 1}`;
          return [
            k,
            (summarize(practical).objects[k] || 0) -
              (summarize(theoretical).objects[k] || 0),
          ];
        }),
      ),
    },
    candidates,
    filters: {
      gerencias: [
        ...new Set(normalized.map((r) => r.gerencia).filter(Boolean)),
      ].sort(),
      turnos: [
        ...new Set(normalized.map((r) => r.turno).filter(Boolean)),
      ].sort(),
      provas: [
        ...new Set(normalized.map((r) => r.prova).filter(Boolean)),
      ].sort(),
      generos: [
        ...new Set(normalized.map((r) => r.genero).filter(Boolean)),
      ].sort(),
      lideres: [
        ...new Set(
          normalized
            .map((r) => String(r.raw.LIDER ?? "").trim())
            .filter(Boolean),
        ),
      ].sort(),
      cargos: [
        ...new Set(
          normalized
            .map((r) => String(r.raw.CARGO ?? "").trim())
            .filter(Boolean),
        ),
      ].sort(),
    },
  };
}
