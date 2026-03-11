// buildDogetagTapscript.ts
// Builds the Tapscript payload representing a Dogetag inscription

import { encodeDogetagMessage, encodeDogetagContentType } from './encodeDogetag';

export interface DogetagTapscript {
  script: Buffer;
  contentType: Buffer;
  content: Buffer;
  totalSize: number;
}

export function buildDogetagTapscript(message: string): DogetagTapscript {
  const content = encodeDogetagMessage(message);
  const contentType = encodeDogetagContentType();

  // Build the Doginals-style Tapscript envelope
  // OP_FALSE OP_IF [content-type] [content] OP_ENDIF
  const scriptParts = [
    Buffer.from([0x00]), // OP_FALSE
    Buffer.from([0x63]), // OP_IF
    pushData(contentType), // Content type push
    pushData(content),     // Content push
    Buffer.from([0x68])    // OP_ENDIF
  ];

  const script = Buffer.concat(scriptParts);
  const totalSize = script.length + contentType.length + content.length;

  return {
    script,
    contentType,
    content,
    totalSize
  };
}

// Helper to create proper data pushes for Tapscript
function pushData(data: Buffer): Buffer {
  const length = data.length;

  if (length === 0) {
    return Buffer.from([0x4c, 0x00]); // OP_PUSHDATA1 + 0x00
  }

  if (length <= 75) {
    // Direct push for small data
    return Buffer.concat([Buffer.from([length]), data]);
  }

  if (length <= 255) {
    // OP_PUSHDATA1 for medium data
    return Buffer.concat([Buffer.from([0x4c, length]), data]);
  }

  if (length <= 65535) {
    // OP_PUSHDATA2 for larger data
    const lengthBuf = Buffer.alloc(2);
    lengthBuf.writeUInt16LE(length, 0);
    return Buffer.concat([Buffer.from([0x4d]), lengthBuf, data]);
  }

  // OP_PUSHDATA4 for very large data (though we limit to 10KB)
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32LE(length, 0);
  return Buffer.concat([Buffer.from([0x4e]), lengthBuf, data]);
}

// Estimate the final witness size for fee calculation
export function estimateDogetagWitnessSize(message: string): number {
  const { script, contentType, content } = buildDogetagTapscript(message);

  // Control block (33 bytes) + script + pushes + content type + content
  // This is a rough estimate for fee calculation
  return 33 + script.length + contentType.length + content.length + 100; // padding for overhead
}

