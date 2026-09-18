"""Exercise the actual PL/Python body with mocked SPI and TypeSafe transport.
This does not replace running CREATE EXTENSION against PostgreSQL.
"""
import io
import json
import pathlib
import textwrap
import unittest
from unittest.mock import patch

SQL = (pathlib.Path(__file__).parents[1] / 'extension/jev--0.1.0.sql').read_text()
BODY = SQL.split('$python$')[1]

class SPI:
    def execute(self, sql):
        return [{'role': 'tester', 'api_key': 'test-key', 'model': 'jev-latest'}]
    def error(self, message):
        raise ValueError(message)

class ExtensionTest(unittest.TestCase):
    def setUp(self):
        self.ns = {'GD': {}, 'plpy': SPI()}
        exec('def evaluate_sql(records, query):\n' + textwrap.indent(BODY, '    '), self.ns)
        self.evaluate = self.ns['evaluate_sql']
    def response(self, value=.9):
        return io.BytesIO(json.dumps({'answers': {'match': {'type': 'noul', 'noul': value}}}).encode())
    def test_cache_and_record_mutation(self):
        with patch('urllib.request.urlopen', side_effect=lambda *a, **k: self.response()) as call:
            rows = json.dumps([{'id': 1}, {'id': 2}])
            self.assertEqual(len(json.loads(self.evaluate(rows, 'remote'))), 2)
            self.evaluate(rows, 'remote')
            self.assertEqual(call.call_count, 2)
            self.evaluate(json.dumps([{'id': 1, 'name': 'changed'}]), 'remote')
            self.assertEqual(call.call_count, 3)
    def test_input_limits(self):
        for rows, query in [('{}', 'q'), ('[]', ''), (json.dumps([{}] * 501), 'q')]:
            with self.assertRaises(ValueError): self.evaluate(rows, query)
    def test_invalid_response_rejected(self):
        with patch('urllib.request.urlopen', side_effect=lambda *a, **k: self.response(True)):
            with self.assertRaises(ValueError): self.evaluate('[{}]', 'q')
        self.assertFalse(self.ns['GD']['jev_cache_v1'])
    def test_empty_batch(self):
        with patch('urllib.request.urlopen') as call:
            self.assertEqual(json.loads(self.evaluate('[]', 'q')), [])
            call.assert_not_called()

if __name__ == '__main__': unittest.main()
