export function ipv4ToInt(ip: string) {
    return ip.split('.').reverse().map((d, i) => parseInt(d, 10) << (i << 3)).reduce((a, b) => a | b)
}
export function ipv4ToBytes(ip: string) {
    let integer = ipv4ToInt(ip);
    return Buffer.from([
        (integer & (0xFF << 24)) >>> 24,
        (integer & (0xFF << 16)) >>> 16,
        (integer & (0xFF <<  8)) >>>  8,
        (integer & (0xFF <<  0)) >>>  0,
    ]);
}

export function ipv6DigitsToBytes(digits: number[]) {
    const bytes = new Array(16);
    for (let i = 0; i < 16; ++i) {
        const shift = ((i & 1 ^ 1) << 3);
        bytes[i] = (digits[i >> 1] & (0xFF << shift)) >>> shift
    }
    return Buffer.from(bytes);
}

export function longIpv6ToBytes(ip: string) {
    return ipv6DigitsToBytes(ip.split(':').map(d => parseInt(d, 16)))
}

export function ipv6ToDigits(ip: string) {
    const digitStrings = ip.split(':');
    const end = digitStrings.length - 1;
    if (digitStrings[  0] === '' && digitStrings[      1] === '') digitStrings[0] = '0';
    if (digitStrings[end] === '' && digitStrings[end - 1] === '') digitStrings[end] = '0';
    const digits = new Array(8);
    let d = 0;
    for (let i = 0; i <= end; ++i) {
        const digitString = digitStrings[i];
        if (digitString === '') {
            for (let j = 8 - end; j > 0; --j) {
                digits[d++] = 0;
            }
        } else {
            digits[d++] = parseInt(digitString, 16);
        }
    }

    return digits;
}

export function ipv6ToBytes(ip: string) {
    return ipv6DigitsToBytes(ipv6ToDigits(ip));
}

const IPV4_FLAG = Buffer.from([ 1 ]);
const IPV6_FLAG = Buffer.from([ 0 ]);

export function ipv4ToID(ip: string) {
    return Buffer.concat([ ipv4ToBytes(ip), IPV4_FLAG ]);
}

export function ipv6ToID(ip: string) {
    return Buffer.concat([ ipv6ToBytes(ip), IPV6_FLAG ]);
}