import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import VoiceAgentPage from './pages/VoiceAgentPage';
import LeadsPage from './pages/LeadsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import CallHistoryPage from './pages/CallHistoryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ArchitecturePage from './pages/ArchitecturePage';
import SettingsPage from './pages/SettingsPage';
import BookingModal from './components/BookingModal';
import ApiKeyModal from './components/ApiKeyModal';
import AuthModal from './components/AuthModal';
import { checkHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('agent');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState({});
  const [systemHealth, setSystemHealth] = useState({ online: true, db: true });

  useEffect(() => {
    const verifySystem = async () => {
      try {
        const res = await checkHealth();
        setSystemHealth({
          online: true,
          db: res.mongodb === 'connected'
        });
      } catch (err) {
        setSystemHealth({ online: false, db: false });
      }
    };
    verifySystem();
    const interval = setInterval(verifySystem, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenBooking = (prefillData = {}) => {
    setBookingPrefill(prefillData);
    setIsBookingOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#F8F9FE] overflow-hidden">
      {/* Dark Purple Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemStatus={systemHealth}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar 
          activeTab={activeTab}
          onStartCall={() => setActiveTab('agent')}
          onBookSlot={() => handleOpenBooking()}
          onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
          onOpenAuthModal={() => setIsAuthOpen(true)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardPage 
              onNavigateToAgent={() => setActiveTab('agent')} 
              onBookSlot={handleOpenBooking}
            />
          )}

          {activeTab === 'agent' && (
            <VoiceAgentPage 
              onOpenBookingWithData={handleOpenBooking}
              onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsPage 
              onBookSlotForLead={handleOpenBooking}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsPage 
              onOpenBookingModal={handleOpenBooking}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBasePage />
          )}

          {activeTab === 'history' && (
            <CallHistoryPage />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage />
          )}

          {activeTab === 'architecture' && (
            <ArchitecturePage />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Global Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialData={bookingPrefill}
        onSuccess={() => {
          // If on appointments or dashboard, can refresh
        }}
      />

      {/* Gemini API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
      />

      {/* Organization Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={() => window.location.reload()}
      />
    </div>
  );
}
