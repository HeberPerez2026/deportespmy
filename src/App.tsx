import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CourtCatalog } from './components/CourtCatalog';
import { ReviewsSection } from './components/ReviewsSection';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, isAdminAuthenticated, reviews } = useApp();
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0';
  const headingText = reviews.length > 0 
    ? `★ ${avgRating} estrellas en ${reviews.length} ${reviews.length === 1 ? 'partido calificado' : 'partidos jugados'}`
    : '¡Sé el primero en calificar tu partido y dejar tu opinión!';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header with Player Navigation & Top-Right Admin Login */}
      <Header
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1">
        
        {/* PLAYER VIEW 1: RESERVAS & HERO */}
        {activeTab === 'turnos' && (
          <>
            <HeroBanner />
            <CourtCatalog onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
            
            {/* Quick Community Reviews preview teaser */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-900/40">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Comunidad Deportiva de Puerto Madryn
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-heading">
                    {headingText}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-lg">
                    Conocé las opiniones de jugadores reales sobre el estado del césped, la iluminación y la atención del buffet.
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

        {/* PLAYER VIEW 2: NUESTRAS CANCHAS & TARIFAS */}
        {activeTab === 'canchas' && (
          <div className="py-6">
            <CourtCatalog onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
          </div>
        )}

        {/* PLAYER VIEW 4: OPINIONES Y VALORACIONES */}
        {activeTab === 'valoraciones' && (
          <ReviewsSection />
        )}

        {/* EXCLUSIVE ADMIN VIEW: ONLY ACCESSIBLE WHEN AUTHENTICATED */}
        {activeTab === 'admin' && (
          isAdminAuthenticated ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <span className="text-xl">🔒</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Requiere Acceso de Administrador</h3>
              <p className="text-xs text-slate-600">
                Este apartado contiene la gestión exclusiva de canchas, tarifas, caja y agenda.
              </p>
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Ingresar Contraseña de Admin
              </button>
            </div>
          )
        )}

      </main>

      {/* Footer */}
      <Footer onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => setActiveTab('admin')}
      />

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
