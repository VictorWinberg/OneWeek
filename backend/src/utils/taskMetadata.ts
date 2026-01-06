/**
 * Task Metadata Utilities
 *
 * Since Google Tasks API doesn't support extendedProperties like Calendar API,
 * we store metadata in the notes field using a structured format.
 *
 * Format: Metadata is stored as JSON at the end of notes, prefixed with a marker.
 */

const METADATA_MARKER = '---ONEWEEK_METADATA---';
const METADATA_REGEX = new RegExp(`${METADATA_MARKER}(.*)$`, 's');

export interface TaskMetadata {
  assignedUser?: string; // User ID from config (e.g., "victor", "annie")
  assignedUserEmail?: string; // User email for reference
  category?: string;
  originalTaskListId?: string;
  [key: string]: string | undefined; // Allow additional custom fields
}

/**
 * Encode metadata into notes field
 * Preserves existing notes and appends metadata at the end
 */
export function encodeTaskMetadata(notes: string | undefined, metadata: TaskMetadata): string {
  const metadataJson = JSON.stringify(metadata);
  const metadataBlock = `\n\n${METADATA_MARKER}${metadataJson}`;

  if (!notes) {
    return metadataBlock.trim();
  }

  // Remove existing metadata if present
  const cleanNotes = notes.replace(METADATA_REGEX, '').trim();

  return cleanNotes + metadataBlock;
}

/**
 * Decode metadata from notes field
 * Returns both the clean notes and the metadata
 */
export function decodeTaskMetadata(notes: string | undefined): {
  notes: string;
  metadata: TaskMetadata;
} {
  if (!notes) {
    return { notes: '', metadata: {} };
  }

  const match = notes.match(METADATA_REGEX);

  if (!match) {
    return { notes: notes.trim(), metadata: {} };
  }

  try {
    const metadata = JSON.parse(match[1]) as TaskMetadata;
    const cleanNotes = notes.replace(METADATA_REGEX, '').trim();
    return { notes: cleanNotes, metadata };
  } catch (error) {
    // If JSON parsing fails, return notes as-is
    console.warn('Failed to parse task metadata:', error);
    return { notes: notes.trim(), metadata: {} };
  }
}

/**
 * Extract only metadata from notes (without modifying notes)
 */
export function extractTaskMetadata(notes: string | undefined): TaskMetadata {
  const { metadata } = decodeTaskMetadata(notes);
  return metadata;
}

/**
 * Update metadata in existing notes
 */
export function updateTaskMetadata(
  notes: string | undefined,
  updates: Partial<TaskMetadata>
): string {
  const { notes: cleanNotes, metadata } = decodeTaskMetadata(notes);
  const updatedMetadata = { ...metadata, ...updates };
  return encodeTaskMetadata(cleanNotes, updatedMetadata);
}

