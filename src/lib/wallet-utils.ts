// Utility functions for wallet operations
// These are still needed for contract interactions

import {Buffer} from 'buffer'

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0';
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'mainnet-alpha';

// Pads a starknet address with leading zeros
export const padAddress = (address: string) => {
    return '0x' + address.slice(2).padStart(64, '0');
};

// Truncates a starknet address with leading zeros
export const truncAddress = (address: string) => {
    return address.slice(0,4) + "...." + address.slice(62,66);
};

// Converts a Felt to a string
export const feltToString = (felt: any)=> {
    const newStrB = Buffer.from(felt.toString(16), 'hex')
    return newStrB.toString()
}

// Converts a string to a Felt
export const stringToFelt = (str: string)=> {
    return "0x" + Buffer.from(str).toString('hex');
}

// Legacy function name for compatibility
export function stringToFelt252(str: string): string {
    return stringToFelt(str);
}

export function addressToContractAddress(address: string): string {
  // Ensure the address is properly formatted for ContractAddress type
  // Starknet addresses should start with 0x and be 66 characters long
  console.log("address", address);
  if (!address.startsWith('0x')) {
    return `0x${address}`;
  }
  console.log("address after", address);
  return address;
}

// Legacy function name for compatibility
export function felt252ToString(felt: string): string {
    return feltToString(felt);
}

// Converts a string to a byte array
export const stringToByteArray = (data: string) => {
    const byteArray = [];
    for (let i = 0; i < data.length; i++) {
        const codePoint = data.codePointAt(i);

        if (!codePoint) continue;

        // If the codePoint is part of a surrogate pair, skip the next character
        if (codePoint > 0xFFFF) {
            i++; // Advance to the next character as it's part of the same emoji
        }

        // Handle UTF-8 encoding
        if (codePoint < 0x80) {
            byteArray.push(codePoint); // 1-byte character
        } else if (codePoint < 0x800) {
            byteArray.push(0xc0 | (codePoint >> 6)); // First byte
            byteArray.push(0x80 | (codePoint & 0x3f)); // Second byte
        } else if (codePoint < 0x10000) {
            byteArray.push(0xe0 | (codePoint >> 12)); // First byte
            byteArray.push(0x80 | ((codePoint >> 6) & 0x3f)); // Second byte
            byteArray.push(0x80 | (codePoint & 0x3f)); // Third byte
        } else {
            byteArray.push(0xf0 | (codePoint >> 18)); // First byte
            byteArray.push(0x80 | ((codePoint >> 12) & 0x3f)); // Second byte
            byteArray.push(0x80 | ((codePoint >> 6) & 0x3f)); // Third byte
            byteArray.push(0x80 | (codePoint & 0x3f)); // Fourth byte
        }
    }
    console.log("Encoded byte array:", byteArray);
    return byteArray;
};

// Converts a byte array (string of comma-separated values) to a string
export const byteArrayToString = (byteArrayString: string) => {
    try {
        // Remove any surrounding quotes and split into numbers
        const byteArray = byteArrayString
            .replace(/^"|"$/g, "") // Remove leading and trailing quotes
            .split(",")
            .map(Number);

        // Convert to Uint8Array
        const uint8Array = new Uint8Array(byteArray);

        // Decode the byte array
        return new TextDecoder().decode(uint8Array);
    } catch (error) {
        console.error("Error decoding byte array string:", error);
        return "";
    }
};

// Converts a hexadecimal string to a number
export const hexToNumber = (hex: string) => {
    console.log('hex', hex)
    if (hex && hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    return parseInt(hex, 16);
};

// Converts a number to a hexadecimal string
export const numberToHex = (num: number, prefix = true) => {
    let hex = num.toString(16);
    console.log('hex', hex)
    return prefix ? '0x' + hex : hex;
};
