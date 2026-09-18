import test from "node:test";
import assert from "node:assert/strict";
import { generateDataset, nextDataset, scoreDemo } from "../server/datasets";
import type { DatasetKind } from "../src/types";

for (const kind of ["people", "countries", "numbers"] satisfies DatasetKind[]) {
  test(`${kind} has unique rows, matching columns, and usable demo queries`, () => {
    const dataset = generateDataset(kind);
    assert.ok(dataset.rows.length >= 18);
    assert.equal(
      new Set(dataset.rows.map((row) => row.id)).size,
      dataset.rows.length,
    );
    for (const row of dataset.rows)
      for (const column of dataset.columns) assert.ok(column.key in row);
    for (const query of dataset.examples)
      assert.equal(scoreDemo(dataset, query).length, dataset.rows.length);
    const next = nextDataset(kind);
    assert.notEqual(next.kind, kind);
    assert.notEqual(next.version, dataset.version);
  });
}

test("numeric demo filtering requires both conditions", () => {
  const dataset = generateDataset("numbers");
  dataset.rows = [
    { id: 1, battery_pct: 12, temperature_c: 45 },
    { id: 2, battery_pct: 90, temperature_c: 45 },
    { id: 3, battery_pct: 12, temperature_c: 10 },
  ];
  const matches = scoreDemo(dataset, "Low battery and high temperature").filter(
    (row) => row.probability >= 0.7,
  );
  assert.deepEqual(
    matches.map(({ row }) => row.id),
    [1],
  );
});

test("unrecognized offline questions never masquerade as model judgments", () => {
  assert.throws(
    () => scoreDemo(generateDataset("people"), "arbitrary question"),
    /API key/,
  );
});
