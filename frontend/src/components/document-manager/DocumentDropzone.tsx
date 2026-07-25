'use client';

import React, { useRef, useState } from 'react';
import { UpdateIcon, UploadIcon } from '@radix-ui/react-icons';

interface DocumentDropzoneProps {
  onFileUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

export function DocumentDropzone({ onFileUpload, uploading }: DocumentDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-subtle hover:border-zinc-400 bg-surface-card'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileUpload(e.target.files[0]);
          }
        }}
      />
      <div className="flex flex-col items-center justify-center gap-2">
        {uploading ? (
          <>
            <UpdateIcon className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs font-medium text-secondary">Mengunggah & Memproses PDF…</p>
          </>
        ) : (
          <>
            <UploadIcon className="w-8 h-8 text-muted" />
            <p className="text-sm font-medium text-primary">Unggah</p>
            <p className="text-xs text-muted">Maks. 50 MB</p>
          </>
        )}
      </div>
    </div>
  );
}
