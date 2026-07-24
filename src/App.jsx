import React, { useState, useEffect } from 'react';
import { INITIAL_DOCUMENTS } from './utils/mockData';
import {
  HomeIcon,
  InboxIcon,
  FilePlusIcon,
  FileTextIcon,
  SettingsIcon,
  UsersIcon,
  ClockIcon
} from './components/Icons';
import Dashboard from './components/Dashboard';
import LedgerTable from './components/LedgerTable';
import RegistryForm from './components/RegistryForm';
import DetailViewer from './components/DetailViewer';
import UserManagement from './components/UserManagement';
import CustomModal from './components/CustomModal';
import appLogo from './assets/logo.png';

// save data to a file when running in WebView2, fall back to localStorage in the browser
const pendingPromises = new Map();
let messageIdCounter = 0;

if (typeof window !== 'undefined' && window.chrome?.webview) {
  window.chrome.webview.addEventListener('message', event => {
    const { id, data, error } = event.data;
    if (pendingPromises.has(id)) {
      const { resolve, reject } = pendingPromises.get(id);
      pendingPromises.delete(id);
      if (error) reject(new Error(error));
      else resolve(data);
    }
  });
}

const callHost = (action, data) => {
  if (typeof window === 'undefined' || !window.chrome?.webview?.postMessage) {
    return Promise.reject(new Error("WebView2 not available"));
  }
  const id = ++messageIdCounter;
  return new Promise((resolve, reject) => {
    pendingPromises.set(id, { resolve, reject });
    window.chrome.webview.postMessage({ id, action, data });
  });
};

const store = {
  read: async () => {
    if (typeof window !== 'undefined' && window.chrome?.webview?.postMessage) {
      try {
        return await callHost('store-read');
      } catch (err) {
        console.error("store.read failed:", err);
        return null;
      }
    }
    try {
      const raw = localStorage.getItem('topnet-bo-store');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  write: async (data) => {
    if (typeof window !== 'undefined' && window.chrome?.webview?.postMessage) {
      try {
        return await callHost('store-write', data);
      } catch (err) {
        console.error("store.write failed:", err);
        return false;
      }
    }
    try {
      localStorage.setItem('topnet-bo-store', JSON.stringify(data));
      return true;
    } catch { return false; }
  }
};

export default function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [users, setUsers] = useState([
    { username: 'admin', fullName: 'Administrateur BO', password: 'admin', role: 'ADMIN' },
    { username: 'agent', fullName: 'Agent Bureau d\'Ordre', password: 'agent', role: 'AGENT' }
  ]);
  const [currentUser, setCurrentUser] = useState(null);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [customModal, setCustomModal] = useState(null);

  const showAlert = (message, title = 'Notification', type = 'info') => {
    return new Promise((resolve) => {
      setCustomModal({
        type,
        title,
        message,
        confirmText: 'OK',
        onConfirm: () => {
          setCustomModal(null);
          resolve(true);
        }
      });
    });
  };

  const showConfirm = (message, title = 'Confirmation', type = 'confirm', confirmText = 'Confirmer', cancelText = 'Annuler') => {
    return new Promise((resolve) => {
      setCustomModal({
        type,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setCustomModal(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomModal(null);
          resolve(false);
        }
      });
    });
  };

  // load saved data when the app starts — but don't restore the session, always ask for login
  useEffect(() => {
    store.read().then(saved => {
      if (saved) {
        if (saved.documents) setDocuments(saved.documents);
        if (saved.users) setUsers(saved.users);
        if (saved.theme) setTheme(saved.theme);
        // don't restore who was logged in — user has to re-enter credentials every time
      }
      setStoreLoaded(true);
    });
  }, []);

  const handleLogin = (username, password) => {
    const found = users.find(u => u.username === username.trim().toLowerCase() && u.password === password);
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedDocument(null);
    setActiveTab('dashboard');
  };

  const handleAddUser = (newUser) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (username) => {
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
    if (currentUser && currentUser.username === updatedUser.username) {
      setCurrentUser(updatedUser);
    }
  };


  // figure out the next ref number for each type so we don't repeat ourselves
  const [nextSeq, setNextSeq] = useState({
    INCOMING: 1,
    OUTGOING: 1
  });

  // save to disk whenever something changes (skip the current user — no auto-login)
  useEffect(() => {
    if (!storeLoaded) return;
    store.write({ documents, users, theme });
  }, [documents, users, theme, storeLoaded]);

  useEffect(() => {
    // recalculate sequence numbers from what's actually in the list
    const incomingSeqs = documents
      .filter(d => d.type === 'INCOMING')
      .map(d => {
        const match = d.reference.match(/ARR-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxIncoming = incomingSeqs.length > 0 ? Math.max(...incomingSeqs) : 0;

    const outgoingSeqs = documents
      .filter(d => d.type === 'OUTGOING')
      .map(d => {
        const match = d.reference.match(/DEP-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const maxOutgoing = outgoingSeqs.length > 0 ? Math.max(...outgoingSeqs) : 0;

    setNextSeq({
      INCOMING: maxIncoming + 1,
      OUTGOING: maxOutgoing + 1
    });
  }, [documents]);

  // switch the theme on the html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // update the clock every second
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddDocument = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    setActiveTab('ledger');
    setSelectedDocument(newDoc);
  };

  const handleAddDocuments = (newDocs) => {
    setDocuments(prev => [...newDocs, ...prev]);
    setActiveTab('ledger');
    setSelectedDocument(null);
  };

  const handleUpdateDocument = (updatedDoc) => {
    setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));
    if (selectedDocument && selectedDocument.id === updatedDoc.id) {
      setSelectedDocument(updatedDoc);
    }
  };

  const handleDeleteDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    if (selectedDocument && selectedDocument.id === docId) {
      setSelectedDocument(null);
    }
  };

  const handleSelectDocumentFromDashboard = (doc) => {
    setSelectedDocument(doc);
    setActiveTab('ledger');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation Panel */}
      <aside className="sidebar noprint">
        <div>
          <div className="brand-logo-container">
            <img src={appLogo} alt="Bureau d'Ordre Logo" className="brand-logo-img" />
          </div>

          <nav>
            <ul className="menu-list">
              <li>
                <div
                  className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('dashboard'); setSelectedDocument(null); }}
                >
                  <HomeIcon size={20} />
                  <span>Tableau de Bord</span>
                </div>
              </li>
              <li>
                <div
                  className={`menu-item ${activeTab === 'ledger' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ledger')}
                >
                  <InboxIcon size={20} />
                  <span>Registre Courriers</span>
                </div>
              </li>
              {currentUser.role !== 'READER' && (
                <li>
                  <div
                    className={`menu-item ${activeTab === 'register' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('register'); setSelectedDocument(null); }}
                  >
                    <FilePlusIcon size={20} />
                    <span>Nouvel Enreg.</span>
                  </div>
                </li>
              )}

              {currentUser.role === 'ADMIN' && (
                <li>
                  <div
                    className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('users'); setSelectedDocument(null); }}
                  >
                    <UsersIcon size={20} />
                    <span>Gestion Utilisateurs</span>
                  </div>
                </li>
              )}
              {currentUser.role !== 'READER' && (
                <li>
                  <div
                    className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('settings'); setSelectedDocument(null); }}
                  >
                    <SettingsIcon size={20} />
                    <span>Paramètres</span>
                  </div>
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'var(--accent)',
              fontSize: '13px'
            }}>
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{currentUser.fullName}</div>
              <div style={{ fontSize: '11px', color: '#a5b1c2' }}>Rôle: {currentUser.role}</div>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {theme === 'light' ? '🌙 Mode Sombre' : '☀️ Mode Clair'}
          </button>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              color: 'var(--danger)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px'
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-bar noprint">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>
            <ClockIcon size={16} />
            <span>
              {currentTime.toLocaleString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', backgroundColor: 'var(--bg-main)', padding: '6px 12px', borderRadius: '4px' }}>
              TUNISIE (FR)
            </span>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--surface-border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Base Locale Connectée</span>
            </div>
          </div>
        </header>

        {/* Content body frame */}
        <div className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              documents={documents}
              onSelectDocument={handleSelectDocumentFromDashboard}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'ledger' && (
            selectedDocument ? (
              <DetailViewer
                document={selectedDocument}
                onUpdateDocument={handleUpdateDocument}
                onDeleteDocument={handleDeleteDocument}
                onBack={() => setSelectedDocument(null)}
                currentUser={currentUser}
                showAlert={showAlert}
                showConfirm={showConfirm}
              />
            ) : (
              <LedgerTable
                documents={documents}
                onSelectDocument={setSelectedDocument}
                onDeleteDocument={handleDeleteDocument}
                onAddDocuments={handleAddDocuments}
                currentUser={currentUser}
                showConfirm={showConfirm}
                showAlert={showAlert}
              />
            )
          )}

          {activeTab === 'register' && (
            <RegistryForm
              onAddDocument={handleAddDocument}
              nextSeq={nextSeq}
              onCancel={() => setActiveTab('dashboard')}
              currentUser={currentUser}
            />
          )}



          {activeTab === 'settings' && (
            <div className="card animate-fade-in" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '12px' }}>
                Paramètres Système
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                Configuration des canaux d'importation et du registre officiel.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ padding: '16px', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '600' }}>Remise à zéro du registre</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Effacer les modifications locales et recharger les courriers par défaut.</p>
                  </div>
                  <button
                    className="btn"
                    style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', padding: '8px 16px', fontSize: '13px' }}
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        'Voulez-vous vraiment réinitialiser la base de données locale ?',
                        'Réinitialisation',
                        'confirm-delete',
                        'Réinitialiser',
                        'Annuler'
                      );
                      if (confirmed) {
                        localStorage.removeItem('topnet-bo-documents');
                        setDocuments(INITIAL_DOCUMENTS);
                        showAlert('Base de données locale réinitialisée.', 'Succès', 'success');
                      }
                    }}
                  >
                    Réinitialiser les données
                  </button>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Champs d'archivage légal</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Format réglementaire des références pour le Bureau d'Ordre National Tunisien (conforme aux normes d'archivage numérique nationales).</p>
                  <input
                    type="text"
                    className="form-control"
                    value="TNET-BO/{ANNEE}/{CODE}-{SEQUENCE}"
                    readOnly
                    style={{ backgroundColor: 'var(--bg-main)', fontFamily: 'monospace', width: '280px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Directions Actives</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Liste des services habilités à recevoir des affectations de documents.</p>
                  <ul style={{ paddingLeft: '16px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li>Direction Technique & Réseau (TECH)</li>
                    <li>Direction Financière & DAF (FINANCE)</li>
                    <li>Secrétariat Général / DG (SECRETARIAT)</li>
                    <li>Direction Affaires Juridiques (JURIDIQUE)</li>
                    <li>Ressources Humaines (RH)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'users' && currentUser.role === 'ADMIN' && (
            <UserManagement
              users={users}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUser={handleUpdateUser}
              currentUser={currentUser}
              documents={documents}
              showAlert={showAlert}
              showConfirm={showConfirm}
            />
          )}
        </div>
      </main>

      {customModal && (
        <CustomModal
          type={customModal.type}
          title={customModal.title}
          message={customModal.message}
          confirmText={customModal.confirmText}
          cancelText={customModal.cancelText}
          onConfirm={customModal.onConfirm}
          onCancel={customModal.onCancel}
        />
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin(username, password)) {
      setError('');
    } else {
      setError('Identifiant ou mot de passe incorrect.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)',
      background: 'linear-gradient(135deg, var(--bg-main) 0%, rgba(10, 61, 98, 0.15) 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px 32px',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        backdropFilter: 'blur(10px)',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: '#0a3d62',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(10, 61, 98, 0.2)'
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f39c12' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0a3d62' }}>TOPNET TUNISIE</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>Bureau d'Ordre Centralisé</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '500',
            border: '1px solid rgba(231, 76, 60, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Identifiant *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Saisir votre identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              style={{ padding: '10px 14px', fontSize: '14px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Mot de passe *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Saisir votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '10px 14px', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '12px',
              fontSize: '14px',
              fontWeight: '700',
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(10, 61, 98, 0.2)'
            }}
          >
            Se connecter
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Système Sécurisé • Topnet Tunisie
        </div>
      </div>
    </div>
  );
}
