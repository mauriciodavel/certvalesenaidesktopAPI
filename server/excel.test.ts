import { describe, expect, it } from "vitest";
import { compareCandidates, dateOnly, percentage, type Candidate } from "./excel.js";

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  candidateKey: "123::prova",
  matricula: "123",
  prova: "PROVA",
  nome: "Participante",
  genero: null,
  gerencia: null,
  coordenacao: null,
  turno: null,
  dataAplicacao: "2026-11-16",
  nota: 80,
  resultado: "Aprovado",
  objects: Object.fromEntries(
    Array.from({ length: 11 }, (_, index) => [`O${index + 1}`, 0]),
  ),
  raw: {},
  ...overrides,
});

describe("normalização da importação", () => {
  it("converte data brasileira para o padrão ISO", () => {
    expect(dateOnly("16/11/2026")).toBe("2026-11-16");
  });

  it("converte fração do Excel e limita o percentual a duas casas", () => {
    expect(percentage(0.333333333333, true)).toBe(33.33);
    expect(percentage(33.333333333333)).toBe(33.33);
  });

  it("ignora diferenças apenas de formato da data e precisão dos objetos", () => {
    const current = candidate({
      dataAplicacao: "2026-11-16T00:00:00.000Z" as string,
      objects: { ...candidate().objects, O1: 33.33000000001 },
    });
    const uploaded = candidate({
      dataAplicacao: "16/11/2026",
      objects: { ...candidate().objects, O1: 33.33 },
    });

    expect(compareCandidates([current], [uploaded]).counts).toMatchObject({
      changed: 0,
      unchanged: 1,
    });
  });

  it("mantém uma alteração real de percentual", () => {
    const current = candidate({ objects: { ...candidate().objects, O1: 33.33 } });
    const uploaded = candidate({ objects: { ...candidate().objects, O1: 33.34 } });

    expect(compareCandidates([current], [uploaded]).changed[0]?.fields).toContain("objects");
  });
});
