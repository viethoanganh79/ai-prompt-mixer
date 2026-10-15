import React, { useState, useCallback, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { PromptMixerProvider, usePromptMixer } from './context/PromptMixerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PromptCanvas } from './components/PromptCanvas';
import { PromptOutputPanel } from './components/PromptOutputPanel';
import { SyncModal } from './components/SyncModal';
import { DatabaseModal } from './components/DatabaseModal';
import { PresetsModal } from './components/PresetsModal';
import { BlockEditorModal } from './components/BlockEditorModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ShareModal, ShareTarget } from './components/ShareModal';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { ZeroKnowledgeSyncModal } from './components/ZeroKnowledgeSyncModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { PromptBlock, PromptPreset } from './types';
import { extractShareFromCurrentUrl, SharedPayload } from './utils/shareUtils';

function PromptMixerApp() {
  const { blocks, presets } = usePromptMixer();

  // Modal states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetsDefaultMode, setPresetsDefaultMode] = useState<'browse' | 'save'>('browse');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PromptBlock | null>(null);

  // Pro Upgrade & Zero-Knowledge Sync Modal states
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isZeroKnowledgeSyncOpen, setIsZeroKnowledgeSyncOpen] = useState(false);

  // Share & Import Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [incomingSharePayload, setIncomingSharePayload] = useState<SharedPayload | null>(null);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Tự động kiểm tra URL chia sẻ (#share=... hoặc ?share=...) khi khởi chạy ứng dụng
  useEffect(() => {
    const detected = extractShareFromCurrentUrl();
    if (detected) {
      setIncomingSharePayload(detected);
      setIsImportModalOpen(true);
      showToast('info', 'Phát hiện dữ liệu chia sẻ qua liên kết URL!', 'Bạn có thể xem trước nội dung và giải quyết trùng lặp trước khi lưu.');
    }
  }, [showToast]);

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

  // Handlers mở Share modal
  const handleShareBlock = useCallback((block: PromptBlock) => {
    setShareTarget({ type: 'block', block });
    setIsShareModalOpen(true);
  }, []);

  const handleSharePreset = useCallback((preset: PromptPreset) => {
    setShareTarget({ type: 'preset', preset });
    setIsShareModalOpen(true);
  }, []);

  const handleShareBundle = useCallback(() => {
    setShareTarget({
      type: 'bundle',
      blocks,
      presets,
      title: 'Thư viện Prompt Mixer cá nhân',
    });
    setIsShareModalOpen(true);
  }, [blocks, presets]);

  // Handler mở Import modal thủ công
  const handleOpenImportModal = useCallback(() => {
    setIncomingSharePayload(null);
    setIsImportModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onOpenPresets={handleOpenBrowsePresets}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onOpenShareBundle={handleShareBundle}
        onOpenImport={handleOpenImportModal}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenZeroKnowledgeSync={() => setIsZeroKnowledgeSyncOpen(true)}
      />

      {/* Main SaaS Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Prompt Block Library */}
        <Sidebar
          onOpenNewBlock={handleOpenNewBlock}
          onEditBlock={handleEditBlock}
          onShareBlock={handleShareBlock}
          onShowToast={showToast}
        />

        {/* Center: Interactive Prompt Mixer Canvas */}
        <PromptCanvas
          onOpenSavePreset={handleOpenSavePreset}
          onOpenNewBlock={handleOpenNewBlock}
          onShowToast={showToast}
        />

        {/* Right: Compiled Output & Live AI Playground */}
        <PromptOutputPanel
          onShowToast={showToast}
          onOpenProModal={() => setIsProModalOpen(true)}
        />
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
        onOpenShareBundle={handleShareBundle}
        onOpenImport={handleOpenImportModal}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenZeroKnowledgeSync={() => setIsZeroKnowledgeSyncOpen(true)}
        onShowToast={showToast}
      />

      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        defaultMode={presetsDefaultMode}
        onSharePreset={handleSharePreset}
        onOpenImport={handleOpenImportModal}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        target={shareTarget}
        onShowToast={showToast}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenSettings={() => setIsDatabaseModalOpen(true)}
      />

      {/* Import & Conflict Resolution Preview Modal */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setIncomingSharePayload(null);
        }}
        incomingPayload={incomingSharePayload}
        onShowToast={showToast}
      />

      {/* Pro Upgrade & Verified Creator Modal */}
      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Zero-Knowledge Multi-Device Sync Modal */}
      <ZeroKnowledgeSyncModal
        isOpen={isZeroKnowledgeSyncOpen}
        onClose={() => setIsZeroKnowledgeSyncOpen(false)}
        onOpenProModal={() => setIsProModalOpen(true)}
        onShowToast={showToast}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PromptMixerProvider>
          <PromptMixerApp />
        </PromptMixerProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
