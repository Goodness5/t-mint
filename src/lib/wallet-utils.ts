import { Buffer } from 'buffer';
import { shortString, cairo, byteArray, BigNumberish } from 'starknet'; // Added necessary Starknet.js imports <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a><a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0';
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';

/**
 * Pads a Starknet address with leading zeros to 64 hexadecimal characters (excluding the '0x' prefix).
 * This ensures a canonical representation for ContractAddress, which is a felt252 <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>.
 * @param address The Starknet address string (e.g., "0x123" or "123").
 * @returns The padded address string (e.g., "0x00...00123").
 */
export const padAddress = (address: string): string => {
    return '0x' + address.replace(/^0x/, '').padStart(64, '0');
};

/**
 * Truncates a Starknet address for display purposes, showing the first and last four characters.
 * @param address The Starknet address string.
 * @returns The truncated address string (e.g., "0x1234....abcd").
 */
export const truncAddress = (address: string): string => {
    if (!address) return '';
    const cleanAddress = address.replace(/^0x/, '');
    if (cleanAddress.length <= 8) return `0x${cleanAddress}`; // Handle very short addresses
    return `0x${cleanAddress.slice(0, 4)}....${cleanAddress.slice(-4)}`;
};

/**
 * Converts a string (up to 31 ASCII characters) to a felt252 hexadecimal string.
 * This is suitable for Cairo's `shortString` type.
 * It leverages `starknet.js`'s `shortString.encodeShortString` for correct encoding <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>.
 * @param str The input string. If longer than 31 characters, it will be truncated by the underlying utility.
 * @returns The hexadecimal representation of the string as a felt252.
 */
export const stringToShortFelt = (str: string): string => {
    if (str.length > 31) {
        console.warn("String exceeds 31 characters. For `shortString`, only the first 31 characters will be encoded. Use `stringToCairoByteArray` for longer strings or `ByteArray` type.");
    }
    return shortString.encodeShortString(str);
};

/**
 * Converts a felt252 (represented as BigNumberish) back to its original short string.
 * This is suitable for Cairo's `shortString` type.
 * It leverages `starknet.js`'s `shortString.decodeShortString` for correct decoding <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>.
 * @param felt The felt252 value (BigNumberish) representing the encoded string.
 * @returns The decoded string.
 */
export const shortFeltToString = (felt: BigNumberish): string => {
    // `shortString.decodeShortString` expects a string or BigInt
    return shortString.decodeShortString(felt.toString());
};

/**
 * Generates a random felt252-like BigInt (0 to 2^252 - 1).
 * This ensures the generated value fits within the 252-bit range of a Cairo felt252 <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a><a href="https://book.cairo-lang.org/ch103-04-L1-L2-messaging.html" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">3</a>.
 * @returns A random BigInt representing a felt252.
 */
export const generateRandomFelt = (): bigint => {
    const array = new Uint8Array(32); // 32 bytes for 256 bits
    crypto.getRandomValues(array);
    // Mask to 252 bits by setting the highest 4 bits of the last byte to 0
    array[31] = array[31] & 0x0F;
    const hex = Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return BigInt(`0x${hex}`);
};

/**
 * Converts a felt252 (BigNumberish) to a readable, truncated hexadecimal string for display.
 * @param felt The felt252 value (BigNumberish).
 * @returns A 12-character uppercase hexadecimal string.
 */
export const feltToCode = (felt: BigNumberish): string => {
    // Ensure felt is a BigInt for consistent toString(16) behavior
    const feltAsBigInt = BigInt(felt);
    const hex = feltAsBigInt.toString(16).padStart(64, '0'); // Pad to 64 chars for full representation
    return hex.slice(0, 12).toUpperCase();
};

/**
 * Converts a readable code string (truncated hex) back to a felt252 BigInt.
 * @param code The 12-character hexadecimal code string.
 * @returns The BigInt representation of the felt252.
 */
export const codeToFelt = (code: string): bigint => {
    console.log(`🔍 codeToFelt conversion:`);
    console.log(`  - Input code: "${code}"`);
    console.log(`  - Code length: ${code.length}`);
    console.log(`  - Code to lowercase: "${code.toLowerCase()}"`);
    
    const hexString = `0x${code.toLowerCase()}`;
    console.log(`  - Hex string: "${hexString}"`);
    
    const result = BigInt(hexString);
    console.log(`  - BigInt result: ${result.toString()}`);
    console.log(`  - BigInt as hex: 0x${result.toString(16)}`);
    console.log(`  - BigInt as hex (padded): 0x${result.toString(16).padStart(64, '0')}`);
    
    return result;
};

/**
 * Converts a string to a Cairo `ByteArray` struct representation.
 * This is suitable for `longString`s (more than 31 characters) or any string intended for a `ByteArray` type in Cairo.
 * It utilizes `starknet.js`'s `byteArray.byteArrayFromString` to correctly serialize the string into the required struct format <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>.
 * @param str The input string.
 * @returns An object representing the Cairo `ByteArray` struct, ready for Starknet.js methods.
 */
export const stringToCairoByteArray = (str: string) => {
    return byteArray.byteArrayFromString(str);
};

/**
 * Converts a Cairo `ByteArray` struct (as returned by Starknet.js) back to a JavaScript string.
 * This function handles the common deserialized format of a `ByteArray` from `starknet.js`.
 * Note: If raw felts are received, more complex parsing based on the `ByteArray` struct definition (length, data, etc.) might be needed.
 * @param byteArrayResult The object representing the deserialized Cairo `ByteArray` (e.g., `{ data: felt[], len: number, ...}`).
 * @returns The decoded string.
 */
export const cairoByteArrayToString = (byteArrayResult: any): string => {
    // If Starknet.js has already fully deserialized it into a string, return it directly.
    if (typeof byteArrayResult === 'string') {
        return byteArrayResult;
    }
    // If it's an object structure (e.g., { data: felt[], len: number, pending_word: felt, pending_word_len: number })
    if (byteArrayResult && Array.isArray(byteArrayResult.data)) {
        // Concatenate hex representations of individual felts and then decode as UTF-8.
        // This assumes each felt in the `data` array represents a segment of the original byte stream.
        const hexString = byteArrayResult.data.map((felt: BigNumberish) => {
            const feltAsBigInt = BigInt(felt);
            // Remove leading zeros from each felt's hex representation to avoid extra null bytes
            return feltAsBigInt.toString(16).replace(/^0+/, '');
        }).join('');

        try {
            const bytes = Buffer.from(hexString, 'hex');
            return bytes.toString('utf8');
        } catch (error) {
            console.error("Error decoding concatenated hex string from ByteArray:", error);
            return "";
        }
    }
    console.warn("Unexpected Cairo ByteArray format for decoding. It might be a raw array of felts or an unhandled struct:", byteArrayResult);
    return "";
};

/**
 * Ensures a Starknet address string has the '0x' prefix.
 * This is a formatting utility. ContractAddress is a felt252 and can be passed as BigNumberish to Starknet.js methods <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">4</a>.
 * @param address The address string.
 * @returns The address string with '0x' prefix.
 */
export function addressToContractAddress(address: string): string {
  if (!address.startsWith('0x')) {
    return `0x${address}`;
  }
  return address;
}

/**
 * Converts a hexadecimal string to a BigInt.
 * This is crucial for handling felt252 values, which can exceed JavaScript's safe integer limit, preventing precision loss <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>.
 * @param hex The hexadecimal string (e.g., "0xabc" or "abc").
 * @returns The BigInt representation.
 */
export const hexToBigInt = (hex: string): bigint => {
    return BigInt(hex);
};

/**
 * Converts a BigNumberish (JavaScript Number, string, or BigInt) to a hexadecimal string.
 * This correctly handles large felt252 values by converting them to BigInt first <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>.
 * @param num The number to convert (BigNumberish).
 * @param prefix Whether to add the '0x' prefix (default: true).
 * @returns The hexadecimal string representation.
 */
export const bigIntToHex = (num: BigNumberish, prefix = true): string => {
    const hex = BigInt(num).toString(16);
    return prefix ? '0x' + hex : hex;
};

// --- Deprecated Functions from Original Code ---
// The following functions from your original code are superseded by the revised functions above:
// - `feltToString`: Replaced by `shortFeltToString` for clarity and `starknet.js` utility usage.
// - `stringToFelt`: Replaced by `stringToShortFelt` for clarity and `starknet.js` utility usage.
// - `stringToFelt252`: Replaced by `stringToShortFelt` (for short strings) and `stringToCairoByteArray` (for long strings/ByteArrays) for precise serialization.
// - `felt252ToString`: Replaced by `shortFeltToString` (for short strings) and `cairoByteArrayToString` (for ByteArrays).
// - `stringToFelt252Legacy`: Deprecated due to type mismatch and replacement by `stringToShortFelt` or `hexToBigInt`.
// - `stringToByteArray`: Replaced by `stringToCairoByteArray` which uses `starknet.js`'s `byteArray` utility for proper Cairo ByteArray serialization.
// - `byteArrayToString`: Replaced by `cairoByteArrayToString` for decoding Starknet's `ByteArray` type. The original was for a custom client-side format.
// - `hexToNumber`: Replaced by `hexToBigInt` to prevent precision loss for large felt252 values <a href="https://starknetjs.com/docs/next/guides/contracts/define_call_message" target="_blank" rel="noopener noreferrer" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative hover:underline">1</a>.
// - `numberToHex`: Replaced by `bigIntToHex` to correctly handle BigInts.