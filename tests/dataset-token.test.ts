import test from "node:test";
import assert from "node:assert/strict";
import { datasetTokens } from "../server/dataset-token";
import { generateDataset } from "../server/datasets";

test("dataset survives a different server instance without changing rows", () => {
  const dataset = generateDataset("people", true);
  const token = datasetTokens("shared-secret").encode(dataset);
  assert.deepEqual(datasetTokens("shared-secret").decode(token), dataset);
  assert.ok(token.length < 60000);
});

test("edited datasets and tokens signed by another key are rejected", () => {
  const tokens = datasetTokens("secret");
  const token = tokens.encode(generateDataset("numbers"));
  assert.throws(() => tokens.decode(`x${token}`));
  assert.throws(() => datasetTokens("other-secret").decode(token));
  assert.throws(() => tokens.decode(null));
});

test("expired datasets are rejected", () => {
  const original = Date.now;
  try {
    Date.now = () => 1000;
    const tokens = datasetTokens("secret");
    const token = tokens.encode(generateDataset("countries"));
    Date.now = () => 3601001;
    assert.throws(() => tokens.decode(token));
  } finally {
    Date.now = original;
  }
});
