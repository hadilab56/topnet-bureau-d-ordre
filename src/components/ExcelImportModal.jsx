import React, { useState, useEffect } from 'react';
import { DEPARTMENTS, CATEGORIES, STATUSES } from '../utils/helpers';
import { FileUpIcon } from './Icons';

export default function ExcelImportModal({ headers, rows, onImport, onCancel, currentUser }) {
  const [mapping, setMapping] = useState({
    reference: '',
    type: '',
    date: '',
    sender: '',
    recipientDept: '',
    subject: '',
    category: '',
    status: ''
  });

  const [defaults, setDefaults] = useState({
    type: 'INCOMING',
    recipientDept: 'TECH',
    category: 'COURRIER',
    status: 'RECEIVED'
  });

  useEffect(() => {
    const newMapping = { ...mapping };
    headers.forEach(h => {
      if (!h) return;
      const lowerH = h.toLowerCase();
      if (lowerH.includes('réf') || lowerH.includes('ref')) {
        if (!newMapping.reference) newMapping.reference = h;
      } else if (lowerH.includes('type')) {
        if (!newMapping.type) newMapping.type = h;
      } else if (lowerH.includes('date')) {
        if (!newMapping.date) newMapping.date = h;
      } else if (lowerH.includes('expéditeur') || lowerH.includes('origine') || lowerH.includes('sender')) {
        if (!newMapping.sender) newMapping.sender = h;
      } else if (lowerH.includes('direction') || lowerH.includes('destinataire') || lowerH.includes('dept')) {
        if (!newMapping.recipientDept) newMapping.recipientDept = h;
      } else if (lowerH.includes('objet') || lowerH.includes('description') || lowerH.includes('sujet')) {
        if (!newMapping.subject) newMapping.subject = h;
      } else if (lowerH.includes('catégorie') || lowerH.includes('cat')) {
        if (!newMapping.category) newMapping.category = h;
      } else if (lowerH.includes('statut') || lowerH.includes('etat')) {
        if (!newMapping.status) newMapping.status = h;
      }
    });
    setMapping(newMapping);
  }, [headers]);

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleDefaultChange = (field, value) => {
    setDefaults(prev => ({ ...prev, [field]: value }));
  };

  const handleImport = () => {
    const importedDocs = [];

    // Helper to find the index of a selected header
    const getColIndex = (headerName) => {
      return headers.findIndex(h => h === headerName);
    };

    const refIdx = getColIndex(mapping.reference);
    const typeIdx = getColIndex(mapping.type);
    const dateIdx = getColIndex(mapping.date);
    const senderIdx = getColIndex(mapping.sender);
    const deptIdx = getColIndex(mapping.recipientDept);
    const subjectIdx = getColIndex(mapping.subject);
    const categoryIdx = getColIndex(mapping.category);
    const statusIdx = getColIndex(mapping.status);

    rows.forEach((row, rowIndex) => {
      // skip completely empty rows
      if (!row || row.length === 0 || row.every(cell => !cell)) return;

      const newDoc = {
        id: `doc-${Date.now()}-${rowIndex}-${Math.floor(Math.random() * 1000)}`,
        reference: (refIdx >= 0 && row[refIdx]) ? String(row[refIdx]) : `IMP-${Date.now()}-${rowIndex}`,
        type: (typeIdx >= 0 && row[typeIdx]) ? String(row[typeIdx]).toUpperCase() : defaults.type,
        date: (dateIdx >= 0 && row[dateIdx]) ? new Date(row[dateIdx]).toISOString() : new Date().toISOString(),
        sender: (senderIdx >= 0 && row[senderIdx]) ? String(row[senderIdx]) : 'Expéditeur inconnu',
        recipientDept: (deptIdx >= 0 && row[deptIdx]) ? String(row[deptIdx]).toUpperCase() : defaults.recipientDept,
        subject: (subjectIdx >= 0 && row[subjectIdx]) ? String(row[subjectIdx]) : 'Sans objet',
        category: (categoryIdx >= 0 && row[categoryIdx]) ? String(row[categoryIdx]).toUpperCase() : defaults.category,
        status: (statusIdx >= 0 && row[statusIdx]) ? String(row[statusIdx]).toUpperCase() : defaults.status,
        senderContact: '',
        senderAddress: '',
        recipientName: '',
        createdBy: currentUser ? currentUser.fullName : 'Import Excel',
        createdByUsername: currentUser ? currentUser.username : 'import',
        fileName: null,
        fileSize: null,
        fileData: null,
        comments: [
          {
            id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user: 'Système BO',
            date: new Date().toISOString(),
            text: 'Document importé depuis un fichier Excel.'
          }
        ],
        history: [
          {
            date: new Date().toISOString(),
            action: 'Importation',
            user: currentUser ? currentUser.fullName : 'Import Excel'
          }
        ]
      };

      // map recognized types if they are somewhat different
      if (!['INCOMING', 'OUTGOING'].includes(newDoc.type)) newDoc.type = defaults.type;

      const deptExists = DEPARTMENTS.some(d => d.id === newDoc.recipientDept);
      if (!deptExists) newDoc.recipientDept = defaults.recipientDept;

      const catExists = CATEGORIES.some(c => c.id === newDoc.category);
      if (!catExists) newDoc.category = defaults.category;

      const statusExists = STATUSES.some(s => s.id === newDoc.status);
      if (!statusExists) newDoc.status = defaults.status;

      importedDocs.push(newDoc);
    });

    onImport(importedDocs);
  };

  const renderSelect = (label, field, required = false) => (
    <div className="form-group" style={{ marginBottom: '12px' }}>
      <label className="form-label" style={{ fontSize: '12px' }}>{label} {required && '*'}</label>
      <select
        className="form-control"
        value={mapping[field]}
        onChange={(e) => handleMappingChange(field, e.target.value)}
        style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}
      >
        <option value="">-- Ignorer (utiliser valeur par défaut) --</option>
        {headers.map((h, i) => (
          <option key={i} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(2px)'
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        backgroundColor: 'var(--surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
          <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(10, 61, 98, 0.1)', padding: '10px', borderRadius: '10px' }}>
            <FileUpIcon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)' }}>Importation de données Excel</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Fichier détecté : {rows.length} lignes valides. Veuillez mapper les colonnes de votre fichier aux champs du registre.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)' }}>Mapping des colonnes</h3>
            {renderSelect('Référence', 'reference')}
            {renderSelect('Date d\'Enregistrement', 'date')}
            {renderSelect('Expéditeur / Provenance', 'sender')}
            {renderSelect('Objet / Description', 'subject')}
            {renderSelect('Direction Affectée', 'recipientDept')}
            {renderSelect('Type de Courrier', 'type')}
            {renderSelect('Catégorie', 'category')}
            {renderSelect('Statut', 'status')}
          </div>

          <div style={{ backgroundColor: 'var(--bg-main)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)' }}>Valeurs par défaut</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ces valeurs seront appliquées si la colonne n'est pas mappée ou si la cellule est vide/invalide.
            </p>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Type de Courrier par défaut</label>
              <select className="form-control" value={defaults.type} onChange={(e) => handleDefaultChange('type', e.target.value)} style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}>
                <option value="INCOMING">Arrivée</option>
                <option value="OUTGOING">Départ</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Direction par défaut</label>
              <select className="form-control" value={defaults.recipientDept} onChange={(e) => handleDefaultChange('recipientDept', e.target.value)} style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Catégorie par défaut</label>
              <select className="form-control" value={defaults.category} onChange={(e) => handleDefaultChange('category', e.target.value)} style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Statut par défaut</label>
              <select className="form-control" value={defaults.status} onChange={(e) => handleDefaultChange('status', e.target.value)} style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Annuler l'import
          </button>
          <button type="button" className="btn btn-accent" onClick={handleImport}>
            Valider et Importer ({rows.length} lignes)
          </button>
        </div>
      </div>
    </div>
  );
}
