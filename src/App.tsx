import React, { useState, useCallback } from 'react';
import { PromptMixerProvider } from './context/PromptMixerContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PromptCanvas } from './components/PromptCanvas';
import { PromptOutputPanel } from './components/PromptOutputPanel';
import { SyncModal } from './components/SyncModal';
import { DatabaseModal } from './components/DatabaseModal';
import { PresetsModal } from './components/PresetsModal';
import { BlockEditorModal } from './components/BlockEditorModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ToastContainer, ToastMessage } from './components/Toast';
import { PromptBlock } from './types';

function PromptMixerApp() {
  // Modal states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetsDefaultMode, setPresetsDefaultMode] = useState<'browse' | 'save'>('browse');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PromptBlock | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleOpenNewBlock = () => {
    setEditingBlock(null);
    setIsBlockEditorOpen(true);
  };

  const handleEditBlock = (block: PromptBlock) => {
    setEditingBlock(block);
    setIsBlockEditorOpen(true);
  };

  const handleOpenSavePreset = () => {
    setPresetsDefaultMode('save');
    setIsPresetsModalOpen(true);
  };

  const handleOpenBrowsePresets = () => {
    setPresetsDefaultMode('browse');
    setIsPresetsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onOpenPresets={handleOpenBrowsePresets}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
      />

      {/* Main SaaS Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Prompt Block Library */}
        <Sidebar
          onOpenNewBlock={handleOpenNewBlock}
          onEditBlock={handleEditBlock}
          onShowToast={showToast}
        />

        {/* Center: Interactive Prompt Mixer Canvas */}
        <PromptCanvas
          onOpenSavePreset={handleOpenSavePreset}
          onOpenNewBlock={handleOpenNewBlock}
          onShowToast={showToast}
        />

        {/* Right: Compiled Output & Live AI Playground */}
        <PromptOutputPanel onShowToast={showToast} />
      </main>

      {/* Modals & Drawers */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onShowToast={showToast}
      />

      <DatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onShowToast={showToast}
      />

      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        defaultMode={presetsDefaultMode}
        onShowToast={showToast}
      />

      <BlockEditorModal
        isOpen={isBlockEditorOpen}
        onClose={() => setIsBlockEditorOpen(false)}
        initialBlock={editingBlock}
        onShowToast={showToast}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        onShowToast={showToast}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <PromptMixerProvider>
      <PromptMixerApp />
    </PromptMixerProvider>
  );
}
