import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CourtCatalog } from './components/CourtCatalog';
import { UserPortal } from './components/UserPortal';
import { ReviewsSection } from './components/ReviewsSection';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AndroidAppSimulator } from './components/AndroidAppSimulator';
import { GitHubHostingModal } from './components/GitHubHostingModal';
import { Footer } from './components/Footer';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header */}
      <Header
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenWhatsAppHistory={() => setActiveTab('admin')}
      />

      {/* Main Body */}
      <main className="flex-1">
        {activeTab === 'turnos' && (
          <>
            <HeroBanner />
            <CourtCatalog />
            {/* Quick Community Reviews preview teaser */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-900/40">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Comunidad Deportiva de Puerto Madryn
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-heading">
                    +4.9 estrellas en más de 140 partidos jugados
                  </h3>
                  <p className="text-xs text-slate-300 max-w-lg">
                    Conocé las opiniones detalladas sobre la calidad del césped, la iluminación nocturna y la atención en el buffet.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('valoraciones')}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm whitespace-nowrap shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  Ver Todas las Opiniones
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'canchas' && (
          <div className="py-6">
            <CourtCatalog />
          </div>
        )}

        {activeTab === 'mis_turnos' && (
          <UserPortal />
        )}

        {activeTab === 'valoraciones' && (
          <ReviewsSection />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenGitHubModal={() => setIsGitHubModalOpen(true)} />

      {/* Modals & Android Simulator */}
      <AndroidAppSimulator />
      {isGitHubModalOpen && (
        <GitHubHostingModal onClose={() => setIsGitHubModalOpen(false)} />
      )}

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
