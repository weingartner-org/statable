import { expect, it } from 'vitest';
import { parseCsv } from './csv';
it('liest Anführungszeichen und Zeilenenden', () => {
  expect(parseCsv('a,b\r\n1,"x,y"\n2,"say ""hi"""\n')).toEqual([['a', 'b'], ['1', 'x,y'], ['2', 'say "hi"']]);
});
