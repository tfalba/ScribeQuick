import { buildFhirBundle, serializeFhirBundle } from '../services/fhir';
import type { SoapNote } from '../services/openai';

const soap: SoapNote = {
  subjective: 'subj',
  objective: 'obj',
  assessment: 'assess',
  plan: 'plan',
  coding_rationale: 'rationale',
  icd10_codes: [
    { code: 'I50.9', description: 'Heart failure, unspecified' },
    { code: 'R60.0', description: 'Localized edema' },
  ],
};

describe('buildFhirBundle', () => {
  // Fixed createdAt so the timestamp is deterministic.
  const bundle = buildFhirBundle({
    patientLabel: 'J.D. — Rm 4',
    soap,
    createdAt: 1_750_000_000_000,
  }) as any;

  it('is a FHIR collection Bundle', () => {
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
  });

  it('contains a Patient, a Composition, and one Condition per code', () => {
    const types = bundle.entry.map((e: any) => e.resource.resourceType);
    expect(types).toEqual(['Patient', 'Composition', 'Condition', 'Condition']);
  });

  it('uses the LOINC SOAP section codes in S/O/A/P order', () => {
    const comp = bundle.entry[1].resource;
    expect(comp.type.coding[0].code).toBe('11488-4');
    expect(comp.status).toBe('preliminary');
    expect(comp.section.map((s: any) => s.code.coding[0].code)).toEqual([
      '61150-9',
      '61149-1',
      '51848-0',
      '18776-5',
    ]);
  });

  it('codes conditions with ICD-10-CM and a provisional status', () => {
    const cond = bundle.entry[2].resource;
    expect(cond.code.coding[0].system).toBe(
      'http://hl7.org/fhir/sid/icd-10-cm'
    );
    expect(cond.code.coding[0].code).toBe('I50.9');
    expect(cond.verificationStatus.coding[0].code).toBe('provisional');
    expect(cond.subject.reference).toBe('Patient/patient-1');
  });

  it('uses the provided createdAt as the bundle timestamp', () => {
    expect(bundle.timestamp).toBe(new Date(1_750_000_000_000).toISOString());
  });

  it('omits Conditions when there are no codes', () => {
    const empty = buildFhirBundle({
      patientLabel: 'X',
      soap: { ...soap, icd10_codes: [] },
    }) as any;
    expect(empty.entry.map((e: any) => e.resource.resourceType)).toEqual([
      'Patient',
      'Composition',
    ]);
  });

  it('escapes XML special characters in section narratives', () => {
    const b = buildFhirBundle({
      patientLabel: 'X',
      soap: { ...soap, subjective: 'a & b < c > d' },
    }) as any;
    const div = b.entry[1].resource.section[0].text.div;
    expect(div).toContain('a &amp; b &lt; c &gt; d');
  });
});

describe('serializeFhirBundle', () => {
  it('produces valid JSON', () => {
    const json = serializeFhirBundle(
      buildFhirBundle({ patientLabel: 'X', soap, createdAt: 1 })
    );
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
