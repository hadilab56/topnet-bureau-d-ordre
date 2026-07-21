import React from 'react';
import { 
  InboxIcon, 
  SendIcon, 
  ClockIcon, 
  FileTextIcon, 
  ChevronRightIcon, 
  AlertIcon 
} from './Icons';
import { getStatusDetails, formatDate } from '../utils/helpers';

export default function Dashboard({ documents, onSelectDocument, setActiveTab }) {
  // Compute metrics
  const total = documents.length;
  const incoming = documents.filter(d => d.type === 'INCOMING').length;
  const outgoing = documents.filter(d => d.type === 'OUTGOING').length;
  
  const pending = documents.filter(d => d.status === 'RECEIVED' || d.status === 'HOLD').length;

  
  // Weekly Load Data: Calculate real-time counts from the documents database
  const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const dailyCounts = [0, 0, 0, 0, 0]; // 0 = Lundi, 1 = Mardi, 2 = Mercredi, 3 = Jeudi, 4 = Vendredi

  // Helper to find start of current week (Monday)
  const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const startOfWeek = getStartOfWeek(new Date());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  documents.forEach(doc => {
    const docDate = new Date(doc.date);
    if (isNaN(docDate.getTime())) return;
    
    // Check if within the current calendar week
    if (docDate >= startOfWeek && docDate <= endOfWeek) {
      const dayIndex = docDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (dayIndex >= 1 && dayIndex <= 5) {
        dailyCounts[dayIndex - 1] += 1;
      }
    }
  });

  const maxCount = Math.max(...dailyCounts, 1);

  // Department distribution
  const deptStats = documents.reduce((acc, doc) => {
    acc[doc.recipientDept] = (acc[doc.recipientDept] || 0) + 1;
    return acc;
  }, {});

  const departmentsList = [
    { id: 'TECH', name: 'Tech & Réseau', color: '#0078d4' },
    { id: 'FINANCE', name: 'Finance & DAF', color: '#107c41' },
    { id: 'SECRETARIAT', name: 'Direction Générale', color: '#8764b8' },
    { id: 'JURIDIQUE', name: 'Affaires Juridiques', color: '#d83b01' },
    { id: 'RH', name: 'Ressources Humaines', color: '#038387' }
  ];

  // Recent 4 documents
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '4px' }}>
            Tableau de Bord
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Aperçu en temps réel des enregistrements du Bureau d'Ordre Topnet.
          </p>
        </div>
        <button 
          className="btn btn-accent" 
          onClick={() => setActiveTab('register')}
          style={{ padding: '10px 20px' }}
        >
          Enregistrer un Courrier
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-info">
            <h3>Courriers Reçus (Arrivées)</h3>
            <div className="value">{incoming}</div>
          </div>
          <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(0, 120, 212, 0.1)', color: '#0078d4' }}>
            <InboxIcon size={24} />
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <h3>Courriers Émis (Départs)</h3>
            <div className="value">{outgoing}</div>
          </div>
          <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(16, 124, 65, 0.1)', color: '#107c41' }}>
            <SendIcon size={24} />
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <h3>En cours de traitement</h3>
            <div className="value">{pending}</div>
          </div>
          <div className="metric-icon-wrapper" style={{ backgroundColor: 'rgba(135, 100, 184, 0.1)', color: '#8764b8' }}>
            <ClockIcon size={24} />
          </div>
        </div>


      </div>

      {/* Charts & Analysis Grid */}
      <div className="charts-grid">
        {/* Weekly load bar chart (SVG) */}
        <div className="card">
          <div className="chart-header">
            <h2 className="chart-title">Volume d'Enregistrement Hebdomadaire</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Courriers / Jour
            </span>
          </div>
          
          <div className="svg-chart-container">
            {weekdays.map((day, idx) => {
              const val = dailyCounts[idx];
              const percent = (val / maxCount) * 80; // Scale to 80% max height
              return (
                <div key={day} className="chart-bar-col">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${percent}%` }}
                    data-value={`${val} doc(s)`}
                  />
                  <div className="chart-label">{day}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department distribution tracker */}
        <div className="card">
          <div className="chart-header">
            <h2 className="chart-title">Charge par Direction</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            {departmentsList.map(dept => {
              const count = deptStats[dept.id] || 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={dept.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500' }}>
                    <span>{dept.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({percent}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${percent}%`, 
                      backgroundColor: dept.color,
                      borderRadius: '4px',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity list */}
      <div className="card" style={{ padding: '24px 0 0 0', overflow: 'hidden' }}>
        <div style={{ padding: '0 24px 18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 className="chart-title">Courriers Récents Reçus & Émis</h2>
          <button 
            className="btn btn-secondary" 
            onClick={() => setActiveTab('ledger')}
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            Voir tout le registre
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentDocs.map((doc, idx) => {
            const status = getStatusDetails(doc.status);
            return (
              <div 
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '16px 24px', 
                  borderBottom: idx === recentDocs.length - 1 ? 'none' : '1px solid var(--surface-border)',
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)'
                }}
                className="recent-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: doc.type === 'INCOMING' ? 'rgba(0, 120, 212, 0.08)' : doc.type === 'OUTGOING' ? 'rgba(16, 124, 65, 0.08)' : 'rgba(243, 156, 18, 0.08)',
                    color: doc.type === 'INCOMING' ? '#0078d4' : doc.type === 'OUTGOING' ? '#107c41' : '#f39c12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {doc.type === 'INCOMING' ? <InboxIcon size={20} /> : <SendIcon size={20} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--primary-dark)' }}>{doc.reference}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>• {formatDate(doc.date)}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {doc.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      De: <strong style={{ color: 'var(--text-main)' }}>{doc.sender}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="badge" style={{ backgroundColor: status.bg, color: status.color, width: '120px', justifyContent: 'center' }}>
                    {status.name}
                  </span>
                  <ChevronRightIcon size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Visual touch: css hover behavior for the rows */}
      <style>{`
        .recent-row:hover {
          background-color: var(--bg-main);
        }
      `}</style>
    </div>
  );
}
