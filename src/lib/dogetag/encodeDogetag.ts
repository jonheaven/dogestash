// encodeDogetag.ts
// Converts a Dogetag message into UTF-8 byte data for Taproot witness inscription

export function encodeDogetagMessage(message: string): Buffer {
  if (message.length === 0) {
    throw new Error('Dogetag message cannot be empty');
  }

  // Check size limits (Dogecoin allows up to ~25KB, but we limit to 10KB for safety)
  const messageBytes = Buffer.from(message, 'utf8');
  if (messageBytes.length > 10240) { // 10KB limit
    throw new Error('Dogetag message too long. Maximum 10KB allowed.');
  }

  return messageBytes;
}

export function encodeDogetagContentType(): Buffer {
  return Buffer.from('text/plain;charset=utf-8', 'utf8');
}

// Validate message content for a specific mode
export function validateDogetagMessage(message: string, mode: 'op_return' | 'witness' = 'witness'): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Dogetag message cannot be empty' };
  }

  const messageBytes = Buffer.from(message, 'utf8');

  // Check mode-specific limits
  if (mode === 'op_return' && messageBytes.length > 80) {
    return { valid: false, error: 'OP_RETURN Dogetag message too long (max 80 bytes)' };
  }

  if (mode === 'witness' && messageBytes.length > 200 * 1024) { // 200KB
    return { valid: false, error: 'Witness Dogetag message too long (max 200KB)' };
  }

  // Check for potentially problematic characters (though we allow most)
  if (message.includes('\u0000')) {
    return { valid: false, error: 'Dogetag message cannot contain null characters' };
  }

  return { valid: true };
}

