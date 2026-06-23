import {
  parseSoapResponse,
  sanitizeIcd10Codes,
  SoapParseError,
  type Icd10Code,
} from '../services/openai';

const validJson = JSON.stringify({
  subjective: 'S',
  objective: 'O',
  assessment: 'A',
  plan: 'P',
  coding_rationale: 'because reasons',
  icd10_codes: [{ code: 'I50.9', description: 'Heart failure, unspecified' }],
});

describe('parseSoapResponse', () => {
  it('parses a valid JSON response', () => {
    const note = parseSoapResponse(validJson);
    expect(note.subjective).toBe('S');
    expect(note.plan).toBe('P');
    expect(note.coding_rationale).toBe('because reasons');
    expect(note.icd10_codes).toHaveLength(1);
  });

  it('strips ```json code fences before parsing', () => {
    const fenced = '```json\n' + validJson + '\n```';
    expect(parseSoapResponse(fenced).objective).toBe('O');
  });

  it('throws SoapParseError on non-JSON text', () => {
    expect(() => parseSoapResponse('not json at all')).toThrow(SoapParseError);
  });

  it('throws SoapParseError when a required field is missing', () => {
    const missingPlan = JSON.stringify({
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      icd10_codes: [],
    });
    expect(() => parseSoapResponse(missingPlan)).toThrow(SoapParseError);
  });

  it('throws SoapParseError on empty input', () => {
    expect(() => parseSoapResponse('')).toThrow(SoapParseError);
  });

  it('preserves the raw response on a parse failure', () => {
    expect.assertions(2);
    try {
      parseSoapResponse('garbage {');
    } catch (err) {
      expect(err).toBeInstanceOf(SoapParseError);
      expect((err as SoapParseError).raw).toBe('garbage {');
    }
  });

  it('normalizes an array coding_rationale into a string', () => {
    const arr = JSON.stringify({
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      plan: 'P',
      coding_rationale: [{ code: 'E11.40', justification: 'neuropathy noted' }],
      icd10_codes: [{ code: 'E11.40', description: 'DM neuropathy' }],
    });
    const note = parseSoapResponse(arr);
    expect(typeof note.coding_rationale).toBe('string');
    expect(note.coding_rationale).toContain('E11.40');
    expect(note.coding_rationale).toContain('neuropathy noted');
  });

  it('drops the contradictory diabetes E11.9 during parsing', () => {
    const withRedundant = JSON.stringify({
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      plan: 'P',
      icd10_codes: [
        { code: 'E11.621', description: 'T2DM with foot ulcer' },
        { code: 'E11.9', description: 'T2DM without complications' },
      ],
    });
    expect(parseSoapResponse(withRedundant).icd10_codes.map((c) => c.code)).toEqual(
      ['E11.621']
    );
  });
});

describe('sanitizeIcd10Codes', () => {
  const codes = (...cs: string[]): Icd10Code[] =>
    cs.map((code) => ({ code, description: code }));

  it('removes "without complications" when a complication code is present', () => {
    expect(
      sanitizeIcd10Codes(codes('E11.621', 'E11.40', 'E11.9')).map((c) => c.code)
    ).toEqual(['E11.621', 'E11.40']);
  });

  it('keeps a lone E11.9', () => {
    expect(sanitizeIcd10Codes(codes('E11.9')).map((c) => c.code)).toEqual([
      'E11.9',
    ]);
  });

  it('removes exact duplicate codes', () => {
    expect(sanitizeIcd10Codes(codes('I50.9', 'I50.9')).map((c) => c.code)).toEqual(
      ['I50.9']
    );
  });

  it('leaves non-diabetes codes untouched', () => {
    expect(sanitizeIcd10Codes(codes('J44.1', 'R05.1')).map((c) => c.code)).toEqual(
      ['J44.1', 'R05.1']
    );
  });

  it('treats diabetes families independently', () => {
    expect(
      sanitizeIcd10Codes(codes('E10.9', 'E11.65', 'E11.9')).map((c) => c.code)
    ).toEqual(['E10.9', 'E11.65']);
  });
});
