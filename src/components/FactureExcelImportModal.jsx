import React, { useState, useEffect } from 'react';
import { FileUpIcon } from './Icons';

export default function FactureExcelImportModal({ headers, rows, onImport, onCancel, currentUser }) {
  const [mapping, setMapping] = useState({
    numeroFacture: '',
    dateFacture: '',
    fournisseur: '',
    montant: '',
    statut: ''
  });

  const [defaults, setDefaults] = useState({
    statut: 'SAISIE'
  });

  useEffect(() => {
    const newMapping = { ...mapping };
    headers.forEach(h => {
      if (!h) return;
      const lowerH = h.toLowerCase();
      // exact matches first for the user's specific file
      if (lowerH === 'numéro de commande') newMapping.numeroFacture = h;
      if (lowerH === 'date de facture') newMapping.dateFacture = h;
      if (lowerH === 'id fiscale client') newMapping.fournisseur = h;
      if (lowerH === 'montant de la facture') newMapping.montant = h;
      if (lowerH === "statut juridique de l'entreprise") newMapping.statut = h;

      // fallbacks
      if (!newMapping.numeroFacture && (lowerH.includes('num') || lowerH.includes('réf') || lowerH.includes('ref'))) {
        newMapping.numeroFacture = h;
      } else if (!newMapping.dateFacture && lowerH.includes('date')) {
        newMapping.dateFacture = h;
      } else if (!newMapping.fournisseur && (lowerH.includes('fournisseur') || lowerH.includes('expéditeur') || lowerH.includes('client'))) {
        newMapping.fournisseur = h;
      } else if (!newMapping.montant && (lowerH.includes('montant') || lowerH.includes('prix') || lowerH.includes('total') || lowerH.includes('somme'))) {
        newMapping.montant = h;
      } else if (!newMapping.statut && (lowerH.includes('statut') || lowerH.includes('etat'))) {
        newMapping.statut = h;
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
    const importedFactures = [];

    const getColIndex = (headerName) => {
      return headers.findIndex(h => h === headerName);
    };

    const numIdx = getColIndex(mapping.numeroFacture);
    const dateIdx = getColIndex(mapping.dateFacture);
    const fournisseurIdx = getColIndex(mapping.fournisseur);
    const montantIdx = getColIndex(mapping.montant);
    const statutIdx = getColIndex(mapping.statut);

    rows.forEach((row, rowIndex) => {
      if (!row || row.length === 0 || row.every(cell => cell === undefined || cell === null || cell === '')) return;

      const hasVal = (idx) => idx >= 0 && row[idx] !== undefined && row[idx] !== null && row[idx] !== '';

      const parsedDate = hasVal(dateIdx) ? new Date(row[dateIdx]) : new Date();
      const finalDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

      const newFacture = {
        id: `facture-${Date.now()}-${rowIndex}-${Math.floor(Math.random() * 1000)}`,
        numeroFacture: hasVal(numIdx) ? String(row[numIdx]) : `IMP-FAC-${Date.now()}-${rowIndex}`,
        dateFacture: finalDate,
        fournisseur: hasVal(fournisseurIdx) ? String(row[fournisseurIdx]) : 'Inconnu',
        montant: hasVal(montantIdx) ? String(row[montantIdx]) : '0',
        statut: hasVal(statutIdx) ? String(row[statutIdx]).toUpperCase() : defaults.statut,
        createdBy: currentUser ? currentUser.fullName : 'Import Excel',
        createdByUsername: currentUser ? currentUser.username : 'import'
      };

      if (!['SAISIE', 'VALIDEE', 'REJETEE'].includes(newFacture.statut)) newFacture.statut = defaults.statut;

      importedFactures.push(newFacture);
    });

    onImport(importedFactures);
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)' }}>Importation de Factures Excel</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Fichier détecté : {rows.length} lignes valides. Veuillez mapper les colonnes de votre fichier aux champs de factures.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)' }}>Mapping des colonnes</h3>
            {renderSelect('Numéro Facture', 'numeroFacture')}
            {renderSelect('Date Facture', 'dateFacture')}
            {renderSelect('Fournisseur', 'fournisseur')}
            {renderSelect('Montant', 'montant')}
            {renderSelect('Statut', 'statut')}
          </div>

          <div style={{ backgroundColor: 'var(--bg-main)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-main)' }}>Valeurs par défaut</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Ces valeurs seront appliquées si la colonne n'est pas mappée ou si la cellule est vide.
            </p>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Statut par défaut</label>
              <select className="form-control" value={defaults.statut} onChange={(e) => handleDefaultChange('statut', e.target.value)} style={{ padding: '6px 10px', height: 'auto', fontSize: '13px' }}>
                <option value="SAISIE">SAISIE</option>
                <option value="VALIDEE">VALIDEE</option>
                <option value="REJETEE">REJETEE</option>
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
