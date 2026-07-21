import React, { useState } from 'react';
import * as xlsx from 'xlsx';
import { FileUpIcon } from './Icons';
import FactureExcelImportModal from './FactureExcelImportModal';
import { formatDate } from '../utils/helpers';

export default function FactureOracleView({ factures, onAddFacture, onAddFactures, onUpdateFacture, onDeleteFacture, currentUser, showAlert, showConfirm }) {
  // states
  const [numeroFacture, setNumeroFacture] = useState('');
  const [dateFacture, setDateFacture] = useState('');
  const [fournisseur, setFournisseur] = useState('');
  const [montant, setMontant] = useState('');

  const [excelData, setExcelData] = useState(null);

  const [editingFactureId, setEditingFactureId] = useState(null);
  const [editForm, setEditForm] = useState({
    numeroFacture: '',
    dateFacture: '',
    fournisseur: '',
    montant: ''
  });

  const handleEditClick = (f) => {
    setEditingFactureId(f.id);
    setEditForm({
      numeroFacture: f.numeroFacture || '',
      dateFacture: f.dateFacture ? f.dateFacture.substring(0, 10) : '',
      fournisseur: f.fournisseur || '',
      montant: f.montant || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingFactureId(null);
  };

  const handleSaveEdit = (f) => {
    const finalDate = editForm.dateFacture ? new Date(editForm.dateFacture).toISOString() : f.dateFacture;
    const updatedFacture = {
      ...f,
      numeroFacture: editForm.numeroFacture.trim(),
      dateFacture: finalDate,
      fournisseur: editForm.fournisseur.trim(),
      montant: editForm.montant.toString().trim()
    };
    if (onUpdateFacture) onUpdateFacture(updatedFacture);
    setEditingFactureId(null);
  };

  const handleDelete = async (id) => {
    if (showConfirm) {
      const confirmed = await showConfirm('Voulez-vous vraiment supprimer cette facture ?', 'Confirmation de suppression', 'warning', 'Supprimer', 'Annuler');
      if (confirmed && onDeleteFacture) {
        onDeleteFacture(id);
      }
    } else {
      if (window.confirm('Voulez-vous vraiment supprimer cette facture ?')) {
        if (onDeleteFacture) onDeleteFacture(id);
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const finalDate = dateFacture ? new Date(dateFacture).toISOString() : new Date().toISOString();
    const newFacture = {
      id: `facture-${Date.now()}`,
      numeroFacture: numeroFacture.trim(),
      dateFacture: finalDate,
      montant: montant.trim(),
      fournisseur: fournisseur.trim(),
      statut: 'SAISIE',
      createdBy: currentUser ? currentUser.fullName : 'BO National',
      createdByUsername: currentUser ? currentUser.username : 'admin',
    };
    onAddFacture(newFacture);
    setNumeroFacture('');
    setFournisseur('');
    setMontant('');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = xlsx.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (data.length < 2) {
          if (showAlert) showAlert('Le fichier Excel semble vide ou ne contient pas de données.', 'Erreur', 'error');
          return;
        }

        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i];
          if (!row) continue;
          const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
          if (nonEmptyCells >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = data[headerRowIndex].map((h, idx) => h ? String(h).trim() : `Colonne ${idx + 1}`);
        const rows = data.slice(headerRowIndex + 1);
        setExcelData({ headers, rows });
      } catch (err) {
        console.error(err);
        if (showAlert) showAlert('Erreur lors de la lecture du fichier Excel/CSV.', 'Erreur', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '4px' }}>
            Factures Oracle Saisis
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Gestion et intégration des factures du système Oracle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentUser && currentUser.role !== 'READER' && (
            <>
              <input
                type="file"
                id="facture-excel-upload-input"
                style={{ display: 'none' }}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
              />
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('facture-excel-upload-input').click()}
                style={{ display: 'flex', gap: '8px', padding: '10px 18px' }}
              >
                <FileUpIcon size={18} /> Importer CSV/Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Saisie Manuelle</h2>
        <form onSubmit={handleManualSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date Facture *</label>
              <input type="date" className="form-control" value={dateFacture ? dateFacture.substring(0, 10) : ''} onChange={(e) => setDateFacture(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Numéro Facture *</label>
              <input type="text" className="form-control" placeholder="Ex: FAC-2026-001" value={numeroFacture} onChange={(e) => setNumeroFacture(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fournisseur</label>
              <input type="text" className="form-control" placeholder="Ex: Oracle Corporation" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Montant</label>
              <input type="text" className="form-control" placeholder="Ex: 5000.00" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="submit" className="btn btn-accent">Enregistrer la Facture</button>
          </div>
        </form>
      </div>

      <div className="ledger-table-container">
        {factures.length > 0 ? (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Numéro Facture</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Créé par</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.map(f => {
                const isEditing = editingFactureId === f.id;
                return (
                <tr key={f.id}>
                  {isEditing ? (
                    <>
                      <td><input type="text" className="form-control" style={{ padding: '6px' }} value={editForm.numeroFacture} onChange={e => setEditForm({...editForm, numeroFacture: e.target.value})} /></td>
                      <td><input type="date" className="form-control" style={{ padding: '6px' }} value={editForm.dateFacture} onChange={e => setEditForm({...editForm, dateFacture: e.target.value})} /></td>
                      <td><input type="text" className="form-control" style={{ padding: '6px' }} value={editForm.fournisseur} onChange={e => setEditForm({...editForm, fournisseur: e.target.value})} /></td>
                      <td><input type="text" className="form-control" style={{ padding: '6px' }} value={editForm.montant} onChange={e => setEditForm({...editForm, montant: e.target.value})} /></td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(0, 120, 212, 0.08)', color: '#0078d4' }}>
                          {f.statut}
                        </span>
                      </td>
                      <td>{f.createdBy}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '13px', marginRight: '8px', backgroundColor: 'var(--success-color, #10b981)', color: 'white', border: 'none' }} onClick={() => handleSaveEdit(f)}>Enregistrer</button>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={handleCancelEdit}>Annuler</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>{f.numeroFacture}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatDate(f.dateFacture)}</td>
                      <td>{f.fournisseur}</td>
                      <td>{f.montant}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(0, 120, 212, 0.08)', color: '#0078d4' }}>
                          {f.statut}
                        </span>
                      </td>
                      <td>{f.createdBy}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', marginRight: '8px' }} onClick={() => handleEditClick(f)}>Modifier</button>
                        <button className="btn" style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f87171' }} onClick={() => handleDelete(f.id)}>Supprimer</button>
                      </td>
                    </>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucune facture enregistrée pour le moment.
          </div>
        )}
      </div>

      {excelData && (
        <FactureExcelImportModal
          headers={excelData.headers}
          rows={excelData.rows}
          currentUser={currentUser}
          onCancel={() => setExcelData(null)}
          onImport={(newFactures) => {
            if (onAddFactures) {
              onAddFactures(newFactures);
              if (showAlert) showAlert(`${newFactures.length} factures importées avec succès.`, 'Succès', 'success');
            }
            setExcelData(null);
          }}
        />
      )}
    </div>
  );
}
