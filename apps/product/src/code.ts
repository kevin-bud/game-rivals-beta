// Short, human-friendly session codes. Avoids characters that are easy to
// confuse on a phone screen (0/O, 1/I/L) so a code read out loud or copied
// from a screenshot is unambiguous.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;

export const generateCode = (): string => {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
};

export const isValidCode = (raw: string | null): raw is string => {
  if (raw === null) {
    return false;
  }
  if (raw.length !== CODE_LENGTH) {
    return false;
  }
  for (const ch of raw) {
    if (!CODE_ALPHABET.includes(ch)) {
      return false;
    }
  }
  return true;
};
