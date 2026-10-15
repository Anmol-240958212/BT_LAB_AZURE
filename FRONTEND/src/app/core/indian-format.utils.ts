export interface StateInfo {
  state: string;
  defaultPin: string;
  cities: { name: string; pin: string }[];
}

export const INDIAN_STATES: StateInfo[] = [
  {
    state: 'Karnataka',
    defaultPin: '560001',
    cities: [
      { name: 'Manipal', pin: '576104' },
      { name: 'Bangalore', pin: '560001' },
      { name: 'Mangalore', pin: '575001' },
      { name: 'Udupi', pin: '576101' },
      { name: 'Mysore', pin: '570001' },
      { name: 'Hubli', pin: '580020' },
      { name: 'Belgaum', pin: '590001' }
    ]
  },
  {
    state: 'Maharashtra',
    defaultPin: '400001',
    cities: [
      { name: 'Mumbai', pin: '400001' },
      { name: 'Pune', pin: '411001' },
      { name: 'Nagpur', pin: '440001' },
      { name: 'Thane', pin: '400601' },
      { name: 'Nashik', pin: '422001' },
      { name: 'Aurangabad', pin: '431001' }
    ]
  },
  {
    state: 'Delhi',
    defaultPin: '110001',
    cities: [
      { name: 'New Delhi', pin: '110001' },
      { name: 'Central Delhi', pin: '110002' },
      { name: 'South Delhi', pin: '110017' },
      { name: 'North Delhi', pin: '110007' },
      { name: 'West Delhi', pin: '110015' }
    ]
  },
  {
    state: 'Tamil Nadu',
    defaultPin: '600001',
    cities: [
      { name: 'Chennai', pin: '600001' },
      { name: 'Coimbatore', pin: '641001' },
      { name: 'Madurai', pin: '625001' },
      { name: 'Tiruchirappalli', pin: '620001' },
      { name: 'Salem', pin: '636001' }
    ]
  },
  {
    state: 'Telangana',
    defaultPin: '500001',
    cities: [
      { name: 'Hyderabad', pin: '500001' },
      { name: 'Secunderabad', pin: '500003' },
      { name: 'Warangal', pin: '506002' },
      { name: 'Nizamabad', pin: '503001' }
    ]
  },
  {
    state: 'Gujarat',
    defaultPin: '380001',
    cities: [
      { name: 'Ahmedabad', pin: '380001' },
      { name: 'Surat', pin: '395001' },
      { name: 'Vadodara', pin: '390001' },
      { name: 'Rajkot', pin: '360001' },
      { name: 'Gandhinagar', pin: '382010' }
    ]
  },
  {
    state: 'Uttar Pradesh',
    defaultPin: '226001',
    cities: [
      { name: 'Noida', pin: '201301' },
      { name: 'Greater Noida', pin: '201308' },
      { name: 'Lucknow', pin: '226001' },
      { name: 'Kanpur', pin: '208001' },
      { name: 'Varanasi', pin: '221001' },
      { name: 'Agra', pin: '282001' },
      { name: 'Ghaziabad', pin: '201001' }
    ]
  },
  {
    state: 'West Bengal',
    defaultPin: '700001',
    cities: [
      { name: 'Kolkata', pin: '700001' },
      { name: 'Howrah', pin: '711101' },
      { name: 'Durgapur', pin: '713201' },
      { name: 'Siliguri', pin: '734001' }
    ]
  },
  {
    state: 'Rajasthan',
    defaultPin: '302001',
    cities: [
      { name: 'Jaipur', pin: '302001' },
      { name: 'Jodhpur', pin: '342001' },
      { name: 'Udaipur', pin: '313001' },
      { name: 'Kota', pin: '324001' }
    ]
  },
  {
    state: 'Kerala',
    defaultPin: '695001',
    cities: [
      { name: 'Kochi', pin: '682001' },
      { name: 'Thiruvananthapuram', pin: '695001' },
      { name: 'Kozhikode', pin: '673001' },
      { name: 'Thrissur', pin: '680001' }
    ]
  },
  {
    state: 'Haryana',
    defaultPin: '122001',
    cities: [
      { name: 'Gurugram', pin: '122001' },
      { name: 'Faridabad', pin: '121001' },
      { name: 'Panipat', pin: '132103' },
      { name: 'Ambala', pin: '133001' }
    ]
  },
  {
    state: 'Punjab',
    defaultPin: '160001',
    cities: [
      { name: 'Chandigarh', pin: '160001' },
      { name: 'Ludhiana', pin: '141001' },
      { name: 'Amritsar', pin: '143001' },
      { name: 'Jalandhar', pin: '144001' }
    ]
  },
  {
    state: 'Madhya Pradesh',
    defaultPin: '462001',
    cities: [
      { name: 'Bhopal', pin: '462001' },
      { name: 'Indore', pin: '452001' },
      { name: 'Gwalior', pin: '474001' },
      { name: 'Jabalpur', pin: '482001' }
    ]
  },
  {
    state: 'Bihar',
    defaultPin: '800001',
    cities: [
      { name: 'Patna', pin: '800001' },
      { name: 'Gaya', pin: '823001' },
      { name: 'Muzaffarpur', pin: '842001' }
    ]
  },
  {
    state: 'Odisha',
    defaultPin: '751001',
    cities: [
      { name: 'Bhubaneswar', pin: '751001' },
      { name: 'Cuttack', pin: '753001' },
      { name: 'Rourkela', pin: '769001' }
    ]
  },
  {
    state: 'Goa',
    defaultPin: '403001',
    cities: [
      { name: 'Panaji', pin: '403001' },
      { name: 'Margao', pin: '403601' },
      { name: 'Vasco da Gama', pin: '403802' }
    ]
  },
  {
    state: 'Andhra Pradesh',
    defaultPin: '520001',
    cities: [
      { name: 'Visakhapatnam', pin: '530001' },
      { name: 'Vijayawada', pin: '520001' },
      { name: 'Guntur', pin: '522001' },
      { name: 'Tirupati', pin: '517501' }
    ]
  },
  {
    state: 'Assam',
    defaultPin: '781001',
    cities: [
      { name: 'Guwahati', pin: '781001' },
      { name: 'Silchar', pin: '788001' },
      { name: 'Dibrugarh', pin: '786001' }
    ]
  },
  {
    state: 'Jharkhand',
    defaultPin: '834001',
    cities: [
      { name: 'Ranchi', pin: '834001' },
      { name: 'Jamshedpur', pin: '831001' },
      { name: 'Dhanbad', pin: '826001' }
    ]
  },
  {
    state: 'Uttarakhand',
    defaultPin: '248001',
    cities: [
      { name: 'Dehradun', pin: '248001' },
      { name: 'Haridwar', pin: '249401' },
      { name: 'Rishikesh', pin: '249201' },
      { name: 'Nainital', pin: '263001' }
    ]
  },
  {
    state: 'Himachal Pradesh',
    defaultPin: '171001',
    cities: [
      { name: 'Shimla', pin: '171001' },
      { name: 'Dharamshala', pin: '176215' },
      { name: 'Manali', pin: '175131' }
    ]
  },
  {
    state: 'Jammu and Kashmir',
    defaultPin: '190001',
    cities: [
      { name: 'Srinagar', pin: '190001' },
      { name: 'Jammu', pin: '180001' }
    ]
  },
  {
    state: 'Chhattisgarh',
    defaultPin: '492001',
    cities: [
      { name: 'Raipur', pin: '492001' },
      { name: 'Bhilai', pin: '490006' },
      { name: 'Bilaspur', pin: '495001' }
    ]
  }
];

/**
 * Formats Indian mobile number as +91 XXXXX XXXXX automatically
 */
export function formatIndianMobile(value: string | null | undefined): string {
  if (!value) return '';
  let trimmed = value.trim();
  if (trimmed.startsWith('+91')) {
    trimmed = trimmed.substring(3);
  } else if (trimmed.startsWith('+ 91')) {
    trimmed = trimmed.substring(4);
  } else if (trimmed.startsWith('91') && trimmed.replace(/\D/g, '').length > 10) {
    trimmed = trimmed.replace(/\D/g, '').substring(2);
  }
  let digits = trimmed.replace(/\D/g, '');
  digits = digits.substring(0, 10);
  if (!digits) return '';
  if (digits.length <= 5) {
    return `+91 ${digits}`;
  }
  return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
}

/**
 * Validates 10-digit Indian mobile number (must start with 6, 7, 8, or 9)
 */
export function isValidIndianMobile(val: string | null | undefined): boolean {
  if (!val || !val.trim()) return false;
  let trimmed = val.trim();
  if (trimmed.startsWith('+91')) {
    trimmed = trimmed.substring(3);
  } else if (trimmed.startsWith('+ 91')) {
    trimmed = trimmed.substring(4);
  } else if (trimmed.startsWith('91') && trimmed.replace(/\D/g, '').length > 10) {
    trimmed = trimmed.replace(/\D/g, '').substring(2);
  }
  const digits = trimmed.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Validates 6-digit Indian PIN / Postal code (100000 - 999999)
 */
export function isValidIndianPin(val: string | null | undefined): boolean {
  if (!val || !val.trim()) return false;
  return /^[1-9][0-9]{5}$/.test(val.trim());
}

/**
 * Formats Aadhaar number as XXXX XXXX XXXX, or •••• •••• XXXX if masked
 */
export function formatAadhaarNumber(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.includes('*') || trimmed.includes('•') || trimmed.includes('X') || trimmed.includes('x')) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    const last4 = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : (trimmed.slice(-4).replace(/\D/g, '') || '0000');
    return `•••• •••• ${last4}`;
  }
  const digits = trimmed.replace(/\D/g, '').substring(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.substring(i, i + 4));
  }
  return parts.join(' ');
}

export type IdentificationType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'VOTER_ID';

export interface IdTypeRule {
  type: IdentificationType;
  label: string;
  placeholder: string;
  hint: string;
  format: (value: string) => string;
  isValid: (value: string) => boolean;
  errorMessage: string;
}

export const ID_RULES: Record<IdentificationType, IdTypeRule> = {
  AADHAAR: {
    type: 'AADHAAR',
    label: 'Aadhaar Card',
    placeholder: 'e.g. 5432 9876 1234',
    hint: '12-digit unique Aadhaar number (format: 4-4-4)',
    format: (val: string) => formatAadhaarNumber(val),
    isValid: (val: string) => {
      if (!val) return false;
      const trimmed = val.trim();
      if (trimmed.includes('*') || trimmed.includes('•') || trimmed.includes('X') || trimmed.includes('x')) {
        return true;
      }
      const digits = trimmed.replace(/\D/g, '');
      // Valid if full 12 digits, or if 4-digit masked suffix
      return digits.length === 12 || digits.length === 4;
    },
    errorMessage: 'Aadhaar number must be exactly 12 digits (e.g. 5432 9876 1234)'
  },
  PAN: {
    type: 'PAN',
    label: 'PAN Card',
    placeholder: 'e.g. ABCDE1234F',
    hint: '10-character Permanent Account Number (5 letters, 4 digits, 1 letter)',
    format: (val: string) => {
      if (!val) return '';
      const trimmed = val.trim();
      if (trimmed.includes('*') || trimmed.includes('•')) return trimmed;
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    },
    isValid: (val: string) => {
      if (!val) return false;
      const trimmed = val.trim().toUpperCase();
      if (trimmed.includes('*') || trimmed.includes('•') || trimmed.length <= 4) return true;
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmed);
    },
    errorMessage: 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)'
  },
  PASSPORT: {
    type: 'PASSPORT',
    label: 'Passport',
    placeholder: 'e.g. A1234567',
    hint: '8-character Indian Passport (1 letter followed by 7 digits)',
    format: (val: string) => {
      if (!val) return '';
      const trimmed = val.trim();
      if (trimmed.includes('*') || trimmed.includes('•')) return trimmed;
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    },
    isValid: (val: string) => {
      if (!val) return false;
      const trimmed = val.trim().toUpperCase();
      if (trimmed.includes('*') || trimmed.includes('•') || trimmed.length <= 4) return true;
      return /^[A-Z]{1}[0-9]{7}$/.test(trimmed);
    },
    errorMessage: 'Passport must be 8 characters: 1 letter followed by 7 digits (e.g. A1234567)'
  },
  VOTER_ID: {
    type: 'VOTER_ID',
    label: 'Voter ID',
    placeholder: 'e.g. ABC1234567',
    hint: '10-character Voter ID / EPIC (3 letters followed by 7 digits)',
    format: (val: string) => {
      if (!val) return '';
      const trimmed = val.trim();
      if (trimmed.includes('*') || trimmed.includes('•')) return trimmed;
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    },
    isValid: (val: string) => {
      if (!val) return false;
      const trimmed = val.trim().toUpperCase();
      if (trimmed.includes('*') || trimmed.includes('•') || trimmed.length <= 4) return true;
      return /^[A-Z]{3}[0-9]{7}$/.test(trimmed);
    },
    errorMessage: 'Voter ID must be 10 characters: 3 letters followed by 7 digits (e.g. ABC1234567)'
  }
};
