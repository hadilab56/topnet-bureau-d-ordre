import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  RouteIcon,
  CheckCircleIcon,
  AlertIcon,
  HistoryIcon,
  DownloadIcon,
  FileTextIcon
} from './Icons';
import {
  getStatusDetails,
  getDepartmentName,
  getCategoryName,
  formatDate,
  DEPARTMENTS,
  CATEGORIES,
  STATUSES
} from '../utils/helpers';

export default function DetailViewer({ document, onUpdateDocument, onDeleteDocument, onBack, currentUser, showAlert, showConfirm }) {
  const [activeTab, setActiveTab] = useState('routing'); // 'routing', 'comments', 'history'

  // inputs for editing the courrier fields
  const [isEditing, setIsEditing] = useState(false);
  const [editRef, setEditRef] = useState(document.reference);
  const [editType, setEditType] = useState(document.type);
  const [editSender, setEditSender] = useState(document.sender);
  const [editSenderContact, setEditSenderContact] = useState(document.senderContact || '');
  const [editSenderAddress, setEditSenderAddress] = useState(document.senderAddress || '');
  const [editRecipientDept, setEditRecipientDept] = useState(document.recipientDept);
  const [editRecipientName, setEditRecipientName] = useState(document.recipientName || '');
  const [editCategory, setEditCategory] = useState(document.category);
  const [editSubject, setEditSubject] = useState(document.subject);

  // routing fields (status and redirection)
  const [targetDept, setTargetDept] = useState(document.recipientDept);
  const [targetStatus, setTargetStatus] = useState(document.status);
  const [routingNote, setRoutingNote] = useState('');

  // Comment State
  const [newComment, setNewComment] = useState('');

  // sync up input states if the parent updates the selected document
  useEffect(() => {
    setEditRef(document.reference);
    setEditType(document.type);
    setEditSender(document.sender);
    setEditSenderContact(document.senderContact || '');
    setEditSenderAddress(document.senderAddress || '');
    setEditRecipientDept(document.recipientDept);
    setEditRecipientName(document.recipientName || '');
    setEditCategory(document.category);
    setEditSubject(document.subject);
    setTargetDept(document.recipientDept);
    setTargetStatus(document.status);
  }, [document]);

  // save the modified fields
  const handleSaveEdit = () => {
    const updatedDoc = {
      ...document,
      reference: editRef.trim() || document.reference,
      type: editType,
      sender: editSender.trim(),
      senderContact: editSenderContact.trim(),
      senderAddress: editSenderAddress.trim(),
      recipientDept: editRecipientDept,
      recipientName: editRecipientName.trim(),
      category: editCategory,
      subject: editSubject.trim(),
      history: [
        ...document.history,
        {
          date: new Date().toISOString(),
          action: 'Modification des informations du courrier',
          user: currentUser.fullName
        }
      ]
    };
    onUpdateDocument(updatedDoc);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // cancel and reset inputs to current doc values
    setEditRef(document.reference);
    setEditType(document.type);
    setEditSender(document.sender);
    setEditSenderContact(document.senderContact || '');
    setEditSenderAddress(document.senderAddress || '');
    setEditRecipientDept(document.recipientDept);
    setEditRecipientName(document.recipientName || '');
    setEditCategory(document.category);
    setEditSubject(document.subject);
    setIsEditing(false);
  };
  // file download handler
  const handleDownload = () => {
    if (document.fileData) {
      // trigger standard base64 down-download
      const a = window.document.createElement('a');
      a.href = document.fileData;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } else {
      // make a fake blob if no real file was uploaded (for mock data)
      const extension = document.fileName.split('.').pop().toLowerCase();
      let blob;
      if (extension === 'pdf') {
        blob = new Blob([`Simulated PDF Content for reference ${document.reference}`], { type: 'application/pdf' });
      } else if (extension === 'png') {
        blob = new Blob([`Simulated PNG Content for reference ${document.reference}`], { type: 'image/png' });
      } else if (extension === 'jpg' || extension === 'jpeg') {
        blob = new Blob([`Simulated JPEG Content for reference ${document.reference}`], { type: 'image/jpeg' });
      } else {
        blob = new Blob([`Simulated Document Content for reference ${document.reference}`], { type: 'text/plain' });
      }

      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // router form submission (updates status/department)
  const handleRoute = (e) => {
    e.preventDefault();

    const isDeptChanged = targetDept !== document.recipientDept;
    const isStatusChanged = targetStatus !== document.status;

    if (!isDeptChanged && !isStatusChanged && !routingNote.trim()) {
      showAlert('Veuillez modifier la direction, le statut, ou ajouter une note de transmission.', 'Attention', 'warning');
      return;
    }

    const updatedHistory = [...document.history];
    const updatedComments = [...document.comments];
    const username = currentUser.fullName;

    if (isDeptChanged) {
      updatedHistory.push({
        date: new Date().toISOString(),
        action: `Redirection de ${getDepartmentName(document.recipientDept)} vers ${getDepartmentName(targetDept)}`,
        user: username
      });
    }

    if (isStatusChanged) {
      updatedHistory.push({
        date: new Date().toISOString(),
        action: `Modification du statut : ${getStatusDetails(targetStatus).name}`,
        user: username
      });
    }

    if (routingNote.trim()) {
      updatedComments.push({
        id: `c-${Date.now()}`,
        user: username,
        date: new Date().toISOString(),
        text: `[Note d'aiguillage] : ${routingNote}`
      });
    }

    const updatedDoc = {
      ...document,
      recipientDept: targetDept,
      status: targetStatus,
      comments: updatedComments,
      history: updatedHistory
    };

    onUpdateDocument(updatedDoc);
    setRoutingNote('');
    showAlert('Workflow de routage mis à jour avec succès.', 'Succès', 'success');
  };

  // add a simple text comment to the doc
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newCommentObj = {
      id: `c-${Date.now()}`,
      user: currentUser.fullName,
      date: new Date().toISOString(),
      text: newComment
    };

    const updatedDoc = {
      ...document,
      comments: [...document.comments, newCommentObj],
      history: [
        ...document.history,
        {
          date: new Date().toISOString(),
          action: 'Ajout d\'un commentaire',
          user: currentUser.fullName
        }
      ]
    };

    onUpdateDocument(updatedDoc);
    setNewComment('');
  };

  const status = getStatusDetails(document.status);

  return (
    <div className="animate-fade-in">
      {/* details view header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              ← Retour au registre
            </button>
            {currentUser.role !== 'READER' && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                ✏️ Modifier
              </button>
            )}
            {currentUser.role !== 'READER' && !isEditing && (
              <button
                onClick={() => {
                  showConfirm(
                    "Voulez-vous vraiment supprimer définitivement ce document ?",
                    "Supprimer le document",
                    "confirm-delete",
                    "Supprimer",
                    "Annuler"
                  ).then(confirmed => {
                    if (confirmed) {
                      onDeleteDocument(document.id);
                    }
                  });
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Supprimer ce document
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="btn btn-accent"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  ✓ Enregistrer les modifications
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Annuler
                </button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-dark)' }}>{document.reference}</h1>
            <span className="badge" style={{ backgroundColor: status.bg, color: status.color }}>
              {status.name}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Enregistré le <strong style={{ color: 'var(--text-main)' }}>{formatDate(document.date)}</strong>
        </div>
      </div>

      <div className="split-container">

        {/* left column: details and tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* info sheet */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>
              Détails du Courrier
            </h3>

            {isEditing ? (
              /* ---- editable form ---- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Référence</label>
                    <input type="text" className="form-control" value={editRef}
                      onChange={e => setEditRef(e.target.value)}
                      style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Type de courrier</label>
                    <select className="form-control" value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '14px' }}>
                      <option value="INCOMING">Arrivée (Externe)</option>
                      <option value="OUTGOING">Départ (Sortant)</option>
                      <option value="INTERNAL">Interne</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Expéditeur</label>
                    <input type="text" className="form-control" value={editSender}
                      onChange={e => setEditSender(e.target.value)}
                      placeholder="Raison sociale / Organisme" style={{ fontSize: '14px' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Contact / Nom</label>
                    <input type="text" className="form-control" value={editSenderContact}
                      onChange={e => setEditSenderContact(e.target.value)}
                      placeholder="Nom du contact" style={{ fontSize: '14px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Adresse Physique</label>
                  <input type="text" className="form-control" value={editSenderAddress}
                    onChange={e => setEditSenderAddress(e.target.value)}
                    placeholder="Adresse" style={{ fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Direction d'affectation</label>
                    <select className="form-control" value={editRecipientDept} onChange={e => setEditRecipientDept(e.target.value)} style={{ fontSize: '14px' }}>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Nom du destinataire</label>
                    <input type="text" className="form-control" value={editRecipientName}
                      onChange={e => setEditRecipientName(e.target.value)}
                      placeholder="Nom responsable" style={{ fontSize: '14px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Catégorie</label>
                  <select className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ fontSize: '14px' }}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Objet / Description</label>
                  <textarea className="form-control" rows="3" value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    placeholder="Objet du courrier" style={{ fontSize: '14px', resize: 'vertical' }} />
                </div>
              </div>
            ) : (
              /* ---- read-only data layout ---- */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', fontSize: '14px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Type de document</div>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {document.type === 'INCOMING' ? 'Arrivée (Externe)' : document.type === 'OUTGOING' ? 'Départ (Sortant)' : 'Interne'}
                  </strong>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Expéditeur / Expéditrice</div>
                  <strong>{document.sender}</strong>
                  {document.senderContact && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Contact: {document.senderContact}</div>}
                  {document.senderAddress && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Adr: {document.senderAddress}</div>}
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Direction d'affectation</div>
                  <strong>{getDepartmentName(document.recipientDept)}</strong>
                  {document.recipientName && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nom: {document.recipientName}</div>}
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Catégorie</div>
                  <strong>{getCategoryName(document.category)}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Objet principal</div>
                  <p style={{ fontWeight: '500', lineHeight: '1.4' }}>{document.subject}</p>
                </div>
              </div>
            )}
          </div>

          {/* status logs and notes tab view */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', backgroundColor: 'var(--bg-main)' }}>
              <button
                onClick={() => setActiveTab('routing')}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  backgroundColor: activeTab === 'routing' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'routing' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'routing' ? '3px solid var(--primary)' : 'none'
                }}
              >
                Aiguillage & Statut
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  backgroundColor: activeTab === 'comments' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'comments' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'comments' ? '3px solid var(--primary)' : 'none'
                }}
              >
                Notes ({document.comments.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  backgroundColor: activeTab === 'history' ? 'var(--surface)' : 'transparent',
                  color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : 'none'
                }}
              >
                Suivi Historique ({document.history.length})
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {activeTab === 'routing' && (
                currentUser.role === 'READER' ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    ⚠️ Vous disposez de droits de lecture seule. Vous ne pouvez pas réaiguiller ce document ou modifier son statut.
                  </div>
                ) : (
                  <form onSubmit={handleRoute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '13px' }}>Rediriger vers la direction</label>
                        <select
                          className="form-control"
                          value={targetDept}
                          onChange={(e) => setTargetDept(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '14px' }}
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '13px' }}>Changer le statut</label>
                        <select
                          className="form-control"
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '14px' }}
                        >
                          {STATUSES.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '13px' }}>Note d'aiguillage / Consignes de traitement</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Indiquez des consignes particulières pour la direction cible..."
                        value={routingNote}
                        onChange={(e) => setRoutingNote(e.target.value)}
                        style={{ fontSize: '14px' }}
                      />
                    </div>

                    <button type="submit" className="btn btn-accent" style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', padding: '10px 20px' }}>
                      <RouteIcon size={16} /> Enregistrer l'affectation
                    </button>
                  </form>
                )
              )}

              {/* internal comments */}
              {activeTab === 'comments' && (
                <div>
                  {currentUser.role !== 'READER' ? (
                    <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ajouter une remarque interne..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{ flex: 1, height: '42px', fontSize: '14px' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', height: '42px' }}>
                        Ajouter
                      </button>
                    </form>
                  ) : (
                    <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px', fontStyle: 'italic' }}>
                      Les lecteurs ne peuvent pas ajouter de remarques.
                    </div>
                  )}

                  <div className="comments-section" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '6px' }}>
                    {document.comments.length > 0 ? (
                      document.comments.map(c => (
                        <div key={c.id} className="comment-bubble" style={{ marginBottom: '10px' }}>
                          <div className="comment-header">
                            <span className="comment-user">{c.user}</span>
                            <span className="comment-date">{formatDate(c.date)}</span>
                          </div>
                          <p style={{ fontSize: '13.5px', lineHeight: '1.4' }}>{c.text}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        Aucun commentaire sur ce dossier.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* timeline history logs */}
              {activeTab === 'history' && (
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', borderLeft: '2px solid var(--surface-border)' }}>
                    {document.history.map((h, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        {/* timeline dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-14px',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--primary)',
                          border: '2px solid var(--surface)'
                        }} />
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          {formatDate(h.date)}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                          {h.action}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Par: {h.user}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right column: document attachments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>
              Document Numérisé
            </h3>
            {document.fileName && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Format : {document.fileName.split('.').pop().toUpperCase()}
              </span>
            )}
          </div>

          {document.fileData ? (
            <div className="document-viewer" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              backgroundColor: 'var(--bg-main)',
              border: '2px dashed var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              minHeight: '480px',
              position: 'relative'
            }}>
              {/* styled document logo */}
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: 'rgba(10, 61, 98, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: 'var(--primary)',
                boxShadow: 'inset 0 4px 10px rgba(0, 0, 0, 0.03)'
              }}>
                <FileTextIcon size={44} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '8px', textAlign: 'center' }}>
                Fichier Prêt au Téléchargement
              </h3>

              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', marginBottom: '24px', lineHeight: '1.5' }}>
                Ce fichier a été numérisé et certifié conforme par le Bureau d'Ordre National de Topnet Tunisie.
              </p>

              {/* metadata preview table */}
              <div style={{
                width: '100%',
                maxWidth: '360px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '28px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nom du fichier :</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)', wordBreak: 'break-all', textAlign: 'right', paddingLeft: '8px' }}>
                    {document.fileName}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-main)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Taille du fichier :</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{document.fileSize}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-main)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Référence :</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {document.reference}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-main)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Certification :</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#27ae60' }} />
                    Certifié Conforme
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 32px',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  maxWidth: '240px'
                }}
              >
                <DownloadIcon size={18} /> Télécharger le document
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px',
              backgroundColor: 'var(--bg-main)',
              border: '2px dashed var(--surface-border)',
              borderRadius: 'var(--radius-lg)',
              minHeight: '480px',
              gap: '16px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(150, 150, 150, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                </svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)', textAlign: 'center' }}>
                Aucun document attaché
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '280px', lineHeight: '1.6' }}>
                Ce courrier a été enregistré sans pièce jointe numérique.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
