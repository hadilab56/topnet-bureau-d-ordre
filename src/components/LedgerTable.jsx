import React, { useState } from 'react';
import {
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileUpIcon
} from './Icons';
import {
  getStatusDetails,
  getDepartmentName,
  formatDate,
  DEPARTMENTS,
  STATUSES
} from '../utils/helpers';
import * as xlsx from 'xlsx';
import ExcelImportModal from './ExcelImportModal';

export default function LedgerTable({ documents, onSelectDocument, onDeleteDocument, onAddDocuments, currentUser, showConfirm, showAlert }) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');


  // Sorting states
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // asc or desc

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Excel import states
  const [excelData, setExcelData] = useState(null);

  // Handles sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'ALL' || doc.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || doc.status === filterStatus;
    const matchesDept = filterDept === 'ALL' || doc.recipientDept === filterDept;

    return matchesSearch && matchesType && matchesStatus && matchesDept;
  });

  // Sort logic
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'date') {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedDocuments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedDocuments.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // CSV Export utility
  const exportToCSV = () => {
    const headers = ['Référence,Type,Date d\'enregistrement,Expéditeur,Destinataire,Objet,Statut\n'];
    const rows = filteredDocuments.map(doc => {
      return `"${doc.reference}","${doc.type}","${formatDate(doc.date)}","${doc.sender.replace(/"/g, '""')}","${getDepartmentName(doc.recipientDept).replace(/"/g, '""')}","${doc.subject.replace(/"/g, '""')}","${doc.status}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows.join('\n')).join('');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Registre_Bureau_Ordre_Topnet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          if (showAlert) showAlert('Le fichier Excel semble vide ou ne contient pas de données.', 'Erreur', 'error');
          return;
        }

        // Auto-detect header row (skip title rows like "Entrée")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i];
          if (!row) continue;
          const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
          // If a row has at least 3 columns, we assume it's the header row
          if (nonEmptyCells >= 3) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = data[headerRowIndex].map((h, idx) => h ? String(h).trim() : `Colonne ${idx + 1}`);
        const rows = data.slice(headerRowIndex + 1);
        setExcelData({ headers, rows });
      } catch (err) {
        console.error(err);
        if (showAlert) showAlert('Erreur lors de la lecture du fichier Excel.', 'Erreur', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // reset input
  };

  // Render sorting arrows
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUpIcon size={14} style={{ display: 'inline', marginLeft: '4px' }} /> : <ChevronDownIcon size={14} style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '4px' }}>
            Registre des Courriers
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Liste générale des documents officiels enregistrés dans le bureau d'ordre.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {currentUser && currentUser.role !== 'READER' && (
            <>
              <input
                type="file"
                id="excel-upload-input"
                style={{ display: 'none' }}
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelUpload}
              />
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById('excel-upload-input').click()}
                style={{ display: 'flex', gap: '8px', padding: '10px 18px' }}
              >
                <FileUpIcon size={18} /> Importer Excel
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={exportToCSV} style={{ display: 'flex', gap: '8px', padding: '10px 18px' }}>
            <DownloadIcon size={18} /> Exporter en CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="filter-panel">
        {/* Text Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Recherche</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Réf, expéditeur, objet..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '42px' }}
            />
            <SearchIcon size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        {/* Type Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Type de courrier</label>
          <select
            className="form-control"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            style={{ height: '42px' }}
          >
            <option value="ALL">Tous les types</option>
            <option value="INCOMING">Arrivée</option>
            <option value="OUTGOING">Départ</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Statut</label>
          <select
            className="form-control"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={{ height: '42px' }}
          >
            <option value="ALL">Tous les statuts</option>
            {STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Direction affectée</label>
          <select
            className="form-control"
            value={filterDept}
            onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
            style={{ height: '42px' }}
          >
            <option value="ALL">Toutes les directions</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>


      </div>

      {/* Grid Ledger Table */}
      <div className="ledger-table-container">
        {currentItems.length > 0 ? (
          <table className="ledger-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('reference')} style={{ cursor: 'pointer' }}>
                  Référence {renderSortIndicator('reference')}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                  Date d'Enreg. {renderSortIndicator('date')}
                </th>
                <th>Type</th>
                <th onClick={() => handleSort('sender')} style={{ cursor: 'pointer' }}>
                  Expéditeur / Provenance {renderSortIndicator('sender')}
                </th>
                <th>Objet / Description</th>
                <th>Direction affectée</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map(doc => {
                const status = getStatusDetails(doc.status);
                return (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>{doc.reference}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatDate(doc.date)}</td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: doc.type === 'INCOMING' ? 'rgba(0, 120, 212, 0.08)' : 'rgba(16, 124, 65, 0.08)',
                        color: doc.type === 'INCOMING' ? '#0078d4' : '#107c41',
                      }}>
                        {doc.type === 'INCOMING' ? 'Arrivée' : 'Départ'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{doc.sender}</td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.subject}>
                      {doc.subject}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{getDepartmentName(doc.recipientDept)}</span>
                    </td>

                    <td>
                      <span className="badge" style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => onSelectDocument(doc)}
                          style={{ padding: '6px 10px', height: '32px', width: '32px' }}
                          title="Visualiser et Router"
                        >
                          <EyeIcon size={14} />
                        </button>
                        {currentUser.role !== 'READER' && (
                          <button
                            className="btn btn-secondary"
                            onClick={async () => {
                              const confirmed = await showConfirm(
                                "Voulez-vous vraiment supprimer définitivement ce document ?",
                                "Supprimer le document",
                                "confirm-delete",
                                "Supprimer",
                                "Annuler"
                              );
                              if (confirmed) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            style={{ padding: '6px 10px', height: '32px', width: '32px', color: 'var(--danger)' }}
                            title="Supprimer le document"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucun courrier ne correspond à vos critères de filtrage.
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Affichage de {indexOfFirstItem + 1} à {Math.min(indexOfLastItem, totalItems)} sur {totalItems} courriers
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Précédent
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
              <button
                key={page}
                className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePageChange(page)}
                style={{ padding: '6px 12px', fontSize: '13px', minWidth: '32px' }}
              >
                {page}
              </button>
            ))}

            <button
              className="btn btn-secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {excelData && (
        <ExcelImportModal
          headers={excelData.headers}
          rows={excelData.rows}
          currentUser={currentUser}
          onCancel={() => setExcelData(null)}
          onImport={(newDocs) => {
            if (onAddDocuments) {
              onAddDocuments(newDocs);
              if (showAlert) showAlert(`${newDocs.length} documents importés avec succès.`, 'Succès', 'success');
            }
            setExcelData(null);
          }}
        />
      )}
    </div>
  );
}
