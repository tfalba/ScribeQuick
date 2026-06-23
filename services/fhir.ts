/**
 * fhir.ts — builds a mock FHIR R4 bundle from a SOAP note.
 *
 * SIMULATION ONLY: this produces a standards-shaped FHIR document for
 * demonstration/export — it is never transmitted to a real EHR. It maps the
 * SOAP note to a Composition (with LOINC-coded sections) and each ICD-10 code to
 * a Condition resource, all referencing a single (anonymized) Patient.
 *
 * Coding systems / codes used:
 *  - Document type:  LOINC 11488-4 "Consult note"
 *  - SOAP sections:  LOINC 61150-9 Subjective, 61149-1 Objective,
 *                    51848-0 Assessment, 18776-5 Plan
 *  - Diagnoses:      ICD-10-CM (http://hl7.org/fhir/sid/icd-10-cm)
 */

import type { SoapNote } from './openai';

const LOINC = 'http://loinc.org';
const ICD10CM = 'http://hl7.org/fhir/sid/icd-10-cm';
const CLINICAL_STATUS = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
const VER_STATUS = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';
const CONDITION_CATEGORY =
  'http://terminology.hl7.org/CodeSystem/condition-category';

export type FhirBundle = Record<string, unknown>;

interface BuildInput {
  patientLabel: string;
  soap: SoapNote;
  /** Epoch ms; defaults to now when omitted (e.g. an unsaved note). */
  createdAt?: number;
}

/** Escape text for safe inclusion in an XHTML Narrative div. */
function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function soapSection(
  title: string,
  code: string,
  display: string,
  text: string
) {
  const body = text?.trim() ? text.trim() : 'Not documented.';
  return {
    title,
    code: { coding: [{ system: LOINC, code, display }] },
    text: {
      status: 'generated',
      div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeXml(body)}</div>`,
    },
  };
}

/**
 * Build a FHIR R4 "collection" Bundle representing the SOAP note + diagnoses.
 * Resources use relative references (Patient/patient-1, etc.).
 */
export function buildFhirBundle({
  patientLabel,
  soap,
  createdAt,
}: BuildInput): FhirBundle {
  const label = patientLabel.trim() || 'Unlabeled patient';
  const timestamp = new Date(createdAt ?? Date.now()).toISOString();

  const patient = {
    resourceType: 'Patient',
    id: 'patient-1',
    identifier: [{ system: 'urn:scribequick:patient-label', value: label }],
    name: [{ text: label }],
  };

  const composition = {
    resourceType: 'Composition',
    id: 'composition-1',
    // "preliminary" — this is an unsigned, AI-assisted draft.
    status: 'preliminary',
    type: {
      coding: [{ system: LOINC, code: '11488-4', display: 'Consult note' }],
      text: 'SOAP note',
    },
    subject: { reference: 'Patient/patient-1' },
    date: timestamp,
    author: [{ display: 'ScribeQuick (AI-assisted draft)' }],
    title: `SOAP Note — ${label}`,
    section: [
      soapSection('Subjective', '61150-9', 'Subjective narrative', soap.subjective),
      soapSection('Objective', '61149-1', 'Objective narrative', soap.objective),
      soapSection('Assessment', '51848-0', 'Assessment note', soap.assessment),
      soapSection('Plan', '18776-5', 'Plan of care note', soap.plan),
    ],
  };

  const conditions = soap.icd10_codes.map((c, i) => ({
    resourceType: 'Condition',
    id: `condition-${i + 1}`,
    clinicalStatus: { coding: [{ system: CLINICAL_STATUS, code: 'active' }] },
    // "provisional" — AI-suggested, not clinically verified.
    verificationStatus: {
      coding: [{ system: VER_STATUS, code: 'provisional' }],
    },
    category: [
      {
        coding: [
          {
            system: CONDITION_CATEGORY,
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis',
          },
        ],
      },
    ],
    code: {
      coding: [{ system: ICD10CM, code: c.code, display: c.description }],
      text: c.description,
    },
    subject: { reference: 'Patient/patient-1' },
  }));

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp,
    entry: [
      { resource: patient },
      { resource: composition },
      ...conditions.map((resource) => ({ resource })),
    ],
  };
}

/** Pretty-print a bundle for display/copy. */
export function serializeFhirBundle(bundle: FhirBundle): string {
  return JSON.stringify(bundle, null, 2);
}
