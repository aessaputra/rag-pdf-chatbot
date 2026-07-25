'use client';

import React, { useState } from 'react';
import ChatWindowHeader from './ChatWindowHeader';
import ChatWindowMessages from './ChatWindowMessages';
import ChatWindowInput from './ChatWindowInput';

export default function ChatWindow() {
  const [inputQuery, setInputQuery] = useState('');

  return (
    <main aria-label="Ruang Percakapan Chat" className="flex-1 flex flex-col h-screen bg-canvas text-primary relative z-10 transition-colors duration-150">
      <ChatWindowHeader />
      <ChatWindowMessages onSetInputQuery={setInputQuery} />
      <ChatWindowInput inputQuery={inputQuery} onChangeInputQuery={setInputQuery} />
    </main>
  );
}
