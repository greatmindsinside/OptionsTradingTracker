/**
 * CSV Parser Module
 * Handles CSV parsing for multiple broker formats with Papa Parse
 */

import Papa from 'papaparse';

export interface CSVParseOptions {
  delimiter?: string;
  header?: boolean;
  skipEmptyLines?: boolean;
  transformHeader?: (header: string) => string;
  encoding?: string;
}

export interface CSVParseResult<T = unknown> {
  data: T[];
  errors: Papa.ParseError[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields?: string[];
  };
}

export interface ImportError {
  row: number;
  column?: string;
  type: 'parsing' | 'validation' | 'business_rule';
  message: string;
  value?: unknown;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
}

/**
 * Base CSV Parser class with common functionality
 */
export class CSVParser {
  private readonly defaultOptions: CSVParseOptions = {
    delimiter: ',',
    header: true,
    skipEmptyLines: true,
    encoding: 'utf-8',
  };

  /**
   * Parse CSV content from string
   */
  async parseFromString<T = unknown>(
    csvContent: string,
    options?: CSVParseOptions
  ): Promise<CSVParseResult<T>> {
    const parseOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      try {
        Papa.parse<T>(csvContent, {
          ...parseOptions,
          // Make Papa Parse more tolerant of field mismatches
          skipEmptyLines: 'greedy', // Skip empty lines more aggressively
          transform: (value: string) => value.trim(), // Trim whitespace
          // Allow Papa Parse to handle inconsistent field counts
          complete: (results: Papa.ParseResult<T>) => {
            resolve({
              data: results.data,
              errors: results.errors,
              meta: results.meta,
            });
          },
          error: (error: Error) => {
            reject(new Error(`CSV parsing failed: ${error.message}`));
          },
        });
      } catch (error) {
        reject(
          new Error(
            `CSV parsing setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
      }
    });
  }

  /**
   * Parse CSV from File object (for browser file uploads)
   */
  async parseFromFile<T = unknown>(
    file: File,
    options?: CSVParseOptions
  ): Promise<CSVParseResult<T>> {
    const parseOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      try {
        Papa.parse<T>(file, {
          ...parseOptions,
          // Make Papa Parse more tolerant of field mismatches
          skipEmptyLines: 'greedy', // Skip empty lines more aggressively
          transform: (value: string) => value.trim(), // Trim whitespace
          // Allow Papa Parse to handle inconsistent field counts
          complete: (results: Papa.ParseResult<T>) => {
            resolve({
              data: results.data,
              errors: results.errors,
              meta: results.meta,
            });
          },
          error: (error: Error) => {
            reject(new Error(`File parsing failed: ${error.message}`));
          },
        });
      } catch (error) {
        reject(
          new Error(
            `File parsing setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
      }
    });
  }

  /**
   * Detect CSV delimiter by analyzing the first few lines
   */
  detectDelimiter(csvSample: string): string {
    const possibleDelimiters = [',', ';', '\t', '|'];
    const lines = csvSample.split('\n').slice(0, 5); // Check first 5 lines

    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of possibleDelimiters) {
      let count = 0;
      for (const line of lines) {
        count += (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      }

      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Validate CSV structure before parsing
   */
  validateCSVStructure(csvContent: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const lines = csvContent.split('\n');

    // Check if file is empty
    if (!csvContent.trim()) {
      issues.push('CSV file is empty');
      return { isValid: false, issues, suggestions };
    }

    // Check if there's at least a header row
    if (lines.length < 1) {
      issues.push('CSV file must have at least a header row');
      return { isValid: false, issues, suggestions };
    }

    // Check for consistent column count
    if (lines.length > 1) {
      const delimiter = this.detectDelimiter(csvContent);
      const headerColumnCount = lines[0].split(delimiter).length;

      let inconsistentRows = 0;
      for (let i = 1; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].trim();
        if (line && line.split(delimiter).length !== headerColumnCount) {
          inconsistentRows++;
        }
      }

      if (inconsistentRows > 0) {
        issues.push(`Found ${inconsistentRows} rows with inconsistent column count`);
        suggestions.push('Check for unescaped delimiters in data or missing columns');
      }
    }

    // Check for potential encoding issues
    if (csvContent.includes('�')) {
      issues.push('Detected potential encoding issues (replacement characters found)');
      suggestions.push('Try different encoding (UTF-8, Latin-1, etc.)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Clean and normalize column headers
   */
  normalizeHeaders(headers: string[]): string[] {
    return headers.map(header =>
      header
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    );
  }

  /**
   * Get CSV preview (first few rows for user confirmation)
   */
  async getPreview(
    csvContent: string,
    maxRows: number = 5,
    options?: CSVParseOptions
  ): Promise<{
    headers: string[];
    rows: unknown[][];
    detectedDelimiter: string;
    totalEstimatedRows: number;
  }> {
    const detectedDelimiter = this.detectDelimiter(csvContent);
    const previewOptions = {
      ...this.defaultOptions,
      ...options,
      delimiter: options?.delimiter || detectedDelimiter,
      preview: maxRows,
    };

    const result = await this.parseFromString(csvContent, previewOptions);

    return {
      headers: result.meta.fields || [],
      rows: result.data as unknown[][],
      detectedDelimiter,
      totalEstimatedRows: csvContent.split('\n').length - 1, // Minus header
    };
  }
}

/**
 * Default CSV parser instance
 */
export const csvParser = new CSVParser();
