import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Extracts text content from a Word document (.docx)
 * @param arrayBuffer - The file content as ArrayBuffer
 * @returns Extracted text content
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extracts text content from an Excel file (.xls, .xlsx)
 * @param arrayBuffer - The file content as ArrayBuffer
 * @returns Extracted text content with sheet names and cell data
 */
export function extractTextFromExcel(arrayBuffer: ArrayBuffer): string {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let extractedText = '';

    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (index > 0) extractedText += '\n\n';
      extractedText += `Sheet: ${sheetName}\n`;
      extractedText += '---\n';
      
      sheetData.forEach((row) => {
        const rowText = row.map(cell => cell !== null && cell !== undefined ? String(cell) : '').join(' | ');
        if (rowText.trim()) {
          extractedText += rowText + '\n';
        }
      });
    });

    return extractedText || 'No content found in Excel file';
  } catch (error) {
    console.error('Error extracting text from Excel:', error);
    throw new Error('Failed to extract text from Excel file');
  }
}

/**
 * Determines if a file is a Word document
 */
export function isWordDocument(mimeType: string, fileName: string): boolean {
  const wordMimes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  const wordExtensions = ['.doc', '.docx'];
  
  return wordMimes.includes(mimeType) || 
         wordExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

/**
 * Determines if a file is an Excel spreadsheet
 */
export function isExcelDocument(mimeType: string, fileName: string): boolean {
  const excelMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];
  const excelExtensions = ['.xls', '.xlsx'];
  
  return excelMimes.includes(mimeType) || 
         excelExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

/**
 * Converts base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Process a document attachment and extract text content
 * @param attachment - The attachment to process
 * @returns Extracted text or null if not a supported document type
 */
export async function processDocumentAttachment(
  attachment: { name: string; mimeType: string; base64: string }
): Promise<string | null> {
  try {
    if (isWordDocument(attachment.mimeType, attachment.name)) {
      const arrayBuffer = base64ToArrayBuffer(attachment.base64);
      return await extractTextFromDocx(arrayBuffer);
    } else if (isExcelDocument(attachment.mimeType, attachment.name)) {
      const arrayBuffer = base64ToArrayBuffer(attachment.base64);
      return extractTextFromExcel(arrayBuffer);
    }
    return null;
  } catch (error) {
    console.error(`Error processing document ${attachment.name}:`, error);
    return null;
  }
}
