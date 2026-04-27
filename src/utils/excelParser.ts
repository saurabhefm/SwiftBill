import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';

export interface ExcelInventoryRow {
  name?: string;
  partNo?: string;
  specifications?: string;
  make?: string;
  uom?: string;
  price?: string | number;
  taxRate?: string | number;
}

export const parseInventoryExcel = async (fileUri: string): Promise<ExcelInventoryRow[]> => {
  try {
    // Read the file as base64
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Parse with XLSX
    const workbook = XLSX.read(fileBase64, { type: 'base64' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    // Map columns dynamically and skip empty rows
    return data.map(row => {
      // Create a normalized row with fuzzy matching for column headers
      const normalized: ExcelInventoryRow = {};
      
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === undefined || value === null) return;

        const lowerKey = key.toLowerCase().trim();
        
        if (lowerKey.includes('name') || lowerKey === 'item' || lowerKey === 'description') {
          normalized.name = String(value);
        } else if (lowerKey.includes('part') || lowerKey.includes('sku')) {
          normalized.partNo = String(value);
        } else if (lowerKey.includes('spec') || lowerKey.includes('detail') || lowerKey.includes('tech')) {
          normalized.specifications = String(value);
        } else if (lowerKey.includes('make') || lowerKey.includes('brand')) {
          normalized.make = String(value);
        } else if (lowerKey.includes('uom') || lowerKey.includes('unit')) {
          normalized.uom = String(value);
        } else if (lowerKey.includes('price') || lowerKey.includes('rate') || lowerKey.includes('cost')) {
          normalized.price = value;
        } else if (lowerKey.includes('tax') || lowerKey.includes('gst')) {
          normalized.taxRate = value;
        }
      });

      return normalized;
    }).filter(row => row.name); // Only keep rows that at least have a name
  } catch (error) {
    console.error('Excel Parse Error:', error);
    throw new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.');
  }
};
