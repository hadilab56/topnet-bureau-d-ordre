import React, { useState, useEffect } from 'react';
import { FileUpIcon, FileTextIcon } from './Icons';
import { DEPARTMENTS, CATEGORIES } from '../utils/helpers';

export default function RegistryForm({ onAddDocument, nextSeq: _nextSeq, onCancel, currentUser }) {
  const [type, setType] = useState('INCOMING');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [sender, setSender] = useState('');
  const [senderContact, setSenderContact] = useState('');

  const [senderAddress, setSenderAddress] = useState('');
  const [recipientDept, setRecipientDept] = useState('TECH');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('COURRIER');

  // state for handling file drag and drop
  const [isDragActive, setIsDragActive] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);

  // refresh the date to right now whenever mounting or changing the type
  useEffect(() => {
    const now = new Date();
    // browser datetime-local input expects YYYY-MM-DDTHH:MM format
    const localNow = now.toISOString().slice(0, 16);
    setDate(localNow);
  }, [type]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        data: e.target.result // store the base64 payload
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('file-upload-input').click();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalRef = reference.trim();
    const finalDate = date ? new Date(date).toISOString() : new Date().toISOString();

    const newDoc = {
      id: `doc-${Date.now()}`,
      reference: finalRef,
      type,
      date: finalDate,
      sender: sender.trim(),
      senderContact,
      senderAddress,
      recipientDept,
      recipientName,
      subject: subject.trim(),
      category,
      createdBy: currentUser ? currentUser.fullName : 'BO National',
      createdByUsername: currentUser ? currentUser.username : 'admin',

      status: 'RECEIVED',
      fileName: attachedFile
        ? attachedFile.name
        : 'Document_Scanne_' + (finalRef ? finalRef.replace(/[/|-]/g, '_') : Date.now()) + '.pdf',
      fileSize: attachedFile ? attachedFile.size : '1.2 MB',
      fileData: attachedFile ? attachedFile.data : null,
      comments: [
        {
          id: `c-${Date.now()}`,
          user: 'Système BO',
          date: new Date().toISOString(),
          text: finalRef
            ? `Document enregistré avec succès sous la référence ${finalRef}.`
            : 'Document enregistré avec succès.'
        }
      ],
      history: [
        {
          date: new Date().toISOString(),
          action: 'Enregistrement',
          user: 'BO National'
        },
        {
          date: new Date().toISOString(),
          action: `Affectation à la direction ${recipientDept}`,
          user: 'BO National'
        }
      ]
    };

    onAddDocument(newDoc);
  };

  return (
    <div className="card animate-fade-in" style={{ padding: '32px' }}>
      <div style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-dark)' }}>Enregistrer un nouveau courrier</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${type === 'INCOMING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setType('INCOMING')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Arrivée
          </button>
          <button
            type="button"
            className={`btn ${type === 'OUTGOING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setType('OUTGOING')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Départ
          </button>
          <button
            type="button"
            className={`btn ${type === 'INTERNAL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setType('INTERNAL')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Interne
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* registry date-time picker */}
          <div className="form-group">
            <label className="form-label">Date & Heure d'Enregistrement</label>
            <input
              type="datetime-local"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* sender info fields */}
          <div className="form-group">
            <label className="form-label">
              {type === 'INCOMING' ? 'Expéditeur (Raison Sociale/Organisme)' : 'Expéditeur (Topnet)'}
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={type === 'INCOMING' ? 'Ex: Tunisie Telecom, Huawei, Client XYZ' : 'Ex: Direction Technique (Topnet)'}
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
          </div>

          {/* sender contact person */}
          <div className="form-group">
            <label className="form-label">Contact / Nom de l'Expéditeur</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: M. Jean Dupont"
              value={senderContact}
              onChange={(e) => setSenderContact(e.target.value)}
            />
          </div>



          <div className="form-group">
            <label className="form-label">Adresse Physique</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Rue des Entrepreneurs, Tunis"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
            />
          </div>

          {/* department selection */}
          <div className="form-group">
            <label className="form-label">Direction</label>
            <select
              className="form-control"
              value={recipientDept}
              onChange={(e) => setRecipientDept(e.target.value)}
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* specific recipient name */}
          <div className="form-group">
            <label className="form-label">Destinataire (Nom du responsable)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: M. Mohamed Ali (ou laisser vide)"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          {/* select category */}
          <div className="form-group">
            <label className="form-label">Catégorie du document</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>



          {/* subject and details text area */}
          <div className="form-group full-width">
            <label className="form-label">Objet / Description du Courrier</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Saisissez l'objet principal du courrier ou document..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* upload scanner files */}
          <div className="form-group full-width">
            <label className="form-label">Numérisation / Attacher le document numérisé</label>

            {!attachedFile ? (
              <div
                className={`drag-drop-zone ${isDragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <div style={{ color: 'var(--primary)', marginBottom: '4px' }}>
                  <FileUpIcon size={32} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>
                  Faites glisser votre fichier ici, ou <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>parcourez vos fichiers</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Formats acceptés : PDF, PNG, JPG (Max. 10 Mo)
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: 'var(--primary)' }}>
                    <FileTextIcon size={28} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{attachedFile.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{attachedFile.size}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* cancel and submit actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-accent">
            Enregistrer dans le Registre
          </button>
        </div>
      </form>
    </div>
  );
}
