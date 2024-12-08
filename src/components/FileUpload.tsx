import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import { Stock } from '../types/portfolio';

interface FileUploadProps {
  onDataUpload: (data: Stock[]) => void;
}

export function FileUpload({ onDataUpload }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    Papa.parse(file, {
      complete: (results) => {
        const stocks: Stock[] = results.data
          .slice(1) // Skip header row
          .map((row: any) => ({
            symbol: row[0],
            quantity: Number(row[1]),
            purchasePrice: Number(row[2]),
          }))
          .filter((stock: Stock) => stock.symbol && stock.quantity && stock.purchasePrice);
        
        onDataUpload(stocks);
      },
      header: false,
    });
  }, [onDataUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-4 text-lg text-gray-600">
        {isDragActive
          ? "Drop the CSV file here"
          : "Drag 'n' drop a CSV file here, or click to select one"}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        File should contain: Symbol, Quantity, Purchase Price
      </p>
    </div>
  );
}