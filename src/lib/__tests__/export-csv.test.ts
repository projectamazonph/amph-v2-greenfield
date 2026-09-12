import { describe, it, expect } from "vitest";
import { toCSV } from "@/lib/export-csv";

describe("toCSV", () => {
  it("renders header row from label", () => {
    const csv = toCSV([], [{ key: "id" as const, label: "ID" }]);
    expect(csv).toBe('"ID"');
  });

  it("renders data rows with proper escaping", () => {
    const rows = [
      { id: "1", name: "Alice", amount: 100 },
      { id: "2", name: "Bob", amount: 200 },
    ];
    const headers = [
      { key: "id" as const, label: "ID" },
      { key: "name" as const, label: "Name" },
      { key: "amount" as const, label: "Amount" },
    ];
    const csv = toCSV(rows, headers);
    expect(csv).toBe('"ID","Name","Amount"\r\n"1","Alice","100"\r\n"2","Bob","200"');
  });

  it("escapates double quotes by doubling them", () => {
    const rows = [{ value: 'he said "hi"' }];
    const csv = toCSV(rows, [{ key: "value" as const, label: "Value" }]);
    expect(csv).toBe('"Value"\r\n"he said ""hi"""');
  });

  it("renders empty string for null and undefined", () => {
    const rows = [{ a: null, b: undefined, c: "ok" }];
    const headers = [
      { key: "a" as const, label: "A" },
      { key: "b" as const, label: "B" },
      { key: "c" as const, label: "C" },
    ];
    const csv = toCSV(rows, headers);
    expect(csv).toBe('"A","B","C"\r\n"","","ok"');
  });
});
