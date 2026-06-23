/**
 * openai.ts — ALL OpenAI logic lives here, nowhere else.
 *
 * Sends rough home-health visit notes to gpt-4o-mini and returns a structured
 * SOAP note plus ICD-10 code suggestions. The model is instructed to return raw
 * JSON only; we still validate the shape before handing it back to the UI.
 */

import axios, { AxiosError } from 'axios';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'gpt-4o-mini';
const TRANSCRIBE_MODEL = 'whisper-1';

const SYSTEM_PROMPT = `You are a clinical documentation assistant helping home health nurses convert
rough visit observations into structured SOAP notes with ICD-10-CM codes.

Coding rules:
- Code only conditions supported by the documentation. Never invent diagnoses,
  vitals, laterality, or severity that are not present in the input.
- Code to the highest specificity the documentation supports. Capture laterality
  (right/left), anatomical site, and severity whenever they are stated. Do not
  drop specificity that is present; use an "unspecified" code only when the
  detail is genuinely missing from the note.
- Apply ICD-10-CM combination and "use additional code" conventions. In
  particular, a complication of diabetes (e.g. foot ulcer, neuropathy,
  nephropathy) must be coded with the diabetes-with-complication combination
  code (E11.6xx) PLUS any required manifestation/site code — not the
  "without complications" code (E11.9).
- Do not assign separate symptom codes for findings that are integral to an
  already-coded condition.

Return ONLY a valid JSON object — no markdown, no preamble, no explanation.
Keys, in this exact order: subjective (string), objective (string),
assessment (string), plan (string), coding_rationale (string: for each code,
briefly justify its laterality, site, severity, and any combination-code link),
icd10_codes (array of objects with keys code and description).
Be concise and clinically accurate.`;

export interface Icd10Code {
  code: string;
  description: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  /** Per-code justification (laterality/site/severity/combination links). */
  coding_rationale?: string;
  icd10_codes: Icd10Code[];
}

/**
 * Thrown when we get a response but it cannot be parsed/validated as a SOAP note.
 * Carries the raw text so the UI can show it as a fallback.
 */
export class SoapParseError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = 'SoapParseError';
    this.raw = raw;
  }
}

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

/**
 * Transcribe a recorded audio file to text via the Whisper API.
 * Used so nurses can dictate rough visit notes instead of typing.
 * @param uri local file URI of the recording (from expo-audio's recorder.uri)
 * @throws Error on missing key, network failure, or API error.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  if (!API_KEY || API_KEY === 'your_key_here') {
    throw new Error(
      'OpenAI API key is not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.'
    );
  }
  if (!uri) {
    throw new Error('No recording was captured. Please try again.');
  }

  const form = new FormData();
  // React Native FormData accepts a { uri, name, type } file descriptor.
  form.append('file', {
    uri,
    name: 'visit-note.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  form.append('model', TRANSCRIBE_MODEL);
  form.append('response_format', 'text');
  // English home-health dictation; nudges Whisper toward clinical phrasing.
  form.append('language', 'en');

  let response: Response;
  try {
    response = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: {
        // Let fetch set the multipart boundary; only send auth here.
        Authorization: `Bearer ${API_KEY}`,
      },
      body: form,
    });
  } catch {
    throw new Error(
      'No response from OpenAI. Check your internet connection and try again.'
    );
  }

  if (!response.ok) {
    let message = `Transcription failed with status ${response.status}.`;
    try {
      const data = await response.json();
      message = data?.error?.message ?? message;
    } catch {
      // response body was not JSON; keep the status-based message
    }
    throw new Error(message);
  }

  // response_format=text returns the transcript as a plain string body.
  const text = await response.text();
  return text.trim();
}

/** Strip ```json fences if the model ignores instructions and wraps the JSON. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isIcd10Array(value: unknown): value is Icd10Code[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as Icd10Code).code === 'string' &&
        typeof (item as Icd10Code).description === 'string'
    )
  );
}

/**
 * Normalize the model's coding_rationale into a display string. The prompt asks
 * for a string, but gpt-4o-mini may instead return an array of {code,
 * justification} objects (or plain strings). Returns undefined when absent.
 */
function normalizeRationale(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          const code = typeof rec.code === 'string' ? rec.code : '';
          const just =
            typeof rec.justification === 'string'
              ? rec.justification
              : typeof rec.rationale === 'string'
                ? rec.rationale
                : '';
          const joined = code && just ? `${code} — ${just}` : code || just;
          return joined.trim();
        }
        return '';
      })
      .filter(Boolean);
    return lines.length > 0 ? lines.join('\n') : undefined;
  }
  return undefined;
}

/**
 * Deterministic post-processing of the model's ICD-10 codes:
 *  1. Drop exact duplicate codes (case-insensitive).
 *  2. Remove the diabetes "without complications" code (E0x.9 / E1x.9) when any
 *     complication code from the same family is also present — coding them
 *     together is contradictory, and gpt-4o-mini still does this occasionally.
 *
 * Families covered: E08, E09, E10, E11, E13 (the ICD-10-CM diabetes chapters).
 */
function sanitizeIcd10Codes(codes: Icd10Code[]): Icd10Code[] {
  const DM_FAMILY = /^(E(?:08|09|10|11|13))/i;

  // Families that have at least one complication code (anything but ".9").
  const familiesWithComplication = new Set<string>();
  for (const c of codes) {
    const norm = c.code.trim().toUpperCase();
    const match = norm.match(DM_FAMILY);
    if (!match) continue;
    const family = match[1];
    if (norm !== `${family}.9`) {
      familiesWithComplication.add(family);
    }
  }

  const seen = new Set<string>();
  const result: Icd10Code[] = [];
  for (const c of codes) {
    const norm = c.code.trim().toUpperCase();
    if (seen.has(norm)) continue; // de-dupe exact repeats
    const match = norm.match(DM_FAMILY);
    if (match) {
      const family = match[1];
      // Drop "without complications" when complications are coded for the family.
      if (norm === `${family}.9` && familiesWithComplication.has(family)) {
        continue;
      }
    }
    seen.add(norm);
    result.push(c);
  }
  return result;
}

/** Validate the parsed object has every SOAP field with the right types. */
function validateSoapNote(parsed: unknown): SoapNote {
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('Response was not a JSON object.');
  }
  const obj = parsed as Record<string, unknown>;
  const stringFields: (keyof SoapNote)[] = [
    'subjective',
    'objective',
    'assessment',
    'plan',
  ];
  for (const field of stringFields) {
    if (typeof obj[field] !== 'string') {
      throw new Error(`Missing or invalid "${field}" field.`);
    }
  }
  if (!isIcd10Array(obj.icd10_codes)) {
    throw new Error('Missing or invalid "icd10_codes" array.');
  }
  return {
    subjective: obj.subjective as string,
    objective: obj.objective as string,
    assessment: obj.assessment as string,
    plan: obj.plan as string,
    // Optional: present only when the model returns it (older notes won't have it).
    // gpt-4o-mini sometimes returns this as an array of {code, justification}
    // objects instead of the requested string, so normalize either shape to text.
    coding_rationale: normalizeRationale(obj.coding_rationale),
    icd10_codes: sanitizeIcd10Codes(obj.icd10_codes),
  };
}

/**
 * Generate a structured SOAP note from rough visit notes.
 * @throws Error on network/API failure, SoapParseError on bad JSON.
 */
export async function generateSoapNote(rawNotes: string): Promise<SoapNote> {
  if (!API_KEY || API_KEY === 'your_key_here') {
    throw new Error(
      'OpenAI API key is not configured. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file.'
    );
  }

  let content: string;
  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: rawNotes },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 60000,
      }
    );
    content = response.data?.choices?.[0]?.message?.content;
  } catch (err) {
    const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
    if (axiosErr.response) {
      const apiMessage =
        axiosErr.response.data?.error?.message ??
        `Request failed with status ${axiosErr.response.status}.`;
      throw new Error(apiMessage);
    }
    if (axiosErr.request) {
      throw new Error(
        'No response from OpenAI. Check your internet connection and try again.'
      );
    }
    throw new Error('Failed to reach OpenAI. Please try again.');
  }

  if (!content || typeof content !== 'string') {
    throw new SoapParseError('OpenAI returned an empty response.', '');
  }

  const cleaned = stripCodeFences(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new SoapParseError(
      'Could not parse the AI response as JSON.',
      content
    );
  }

  try {
    return validateSoapNote(parsed);
  } catch (err) {
    throw new SoapParseError(
      err instanceof Error ? err.message : 'Response did not match the SOAP format.',
      content
    );
  }
}
