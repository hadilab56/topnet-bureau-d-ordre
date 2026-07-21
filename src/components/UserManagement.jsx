import React, { useState } from 'react';
import { UsersIcon, PlusIcon } from './Icons';

export default function UserManagement({ users, onAddUser, onDeleteUser, onUpdateUser, currentUser, documents = [], showAlert, showConfirm }) {
  // Creation form inputs
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('READER');

  // Inline row edit states
  const [editingUsername, setEditingUsername] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('READER');

  // Submit new user
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!newUsername.trim() || !newFullName.trim() || !newPassword.trim()) {
      showAlert('Veuillez remplir tous les champs obligatoires.', 'Erreur', 'warning');
      return;
    }

    const usernameLower = newUsername.trim().toLowerCase();
    
    if (users.some(u => u.username === usernameLower)) {
      showAlert('Cet identifiant est déjà utilisé.', 'Erreur', 'warning');
      return;
    }

    onAddUser({
      username: usernameLower,
      fullName: newFullName.trim(),
      password: newPassword,
      role: newRole
    });

    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
    setNewRole('READER');
    showAlert('Utilisateur créé avec succès !', 'Succès', 'success');
  };

  // Start editing a user row
  const startEdit = (user) => {
    setEditingUsername(user.username);
    setEditFullName(user.fullName);
    setEditPassword(user.password);
    setEditRole(user.role);
  };

  // Save the edited user details
  const saveEdit = (username) => {
    if (!editFullName.trim() || !editPassword.trim()) {
      showAlert('Le nom complet et le mot de passe ne peuvent pas être vides.', 'Erreur', 'warning');
      return;
    }

    onUpdateUser({
      username: username,
      fullName: editFullName.trim(),
      password: editPassword,
      role: editRole
    });

    setEditingUsername(null);
    showAlert('Utilisateur mis à jour avec succès !', 'Succès', 'success');
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'AGENT': return 'Agent BO';
      case 'READER': return 'Lecteur (Lecture Seule)';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return { backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c' };
      case 'AGENT':
        return { backgroundColor: 'rgba(52, 152, 219, 0.1)', color: '#3498db' };
      case 'READER':
        return { backgroundColor: 'rgba(149, 165, 166, 0.1)', color: '#7f8c8d' };
      default:
        return { backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' };
    }
  };

  // Calculate statistics for each user
  const getUserStats = (username, fullName) => {
    const registeredCount = documents.filter(d => d.createdByUsername === username).length;
    // count how many history logs were logged by this user's name
    const actionsCount = documents.reduce((total, d) => {
      const logsByUser = d.history ? d.history.filter(h => h.user === fullName).length : 0;
      return total + logsByUser;
    }, 0);

    return { registeredCount, actionsCount };
  };

  // Compute summary stats for the cards block
  const totalRegistered = documents.length;
  
  // Find most active user (most courriers registered)
  let mostActiveUser = 'Aucun';
  let maxRegistrations = -1;
  users.forEach(u => {
    const regCount = documents.filter(d => d.createdByUsername === u.username).length;
    if (regCount > maxRegistrations && regCount > 0) {
      maxRegistrations = regCount;
      mostActiveUser = u.fullName;
    }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UsersIcon size={24} /> Gestion des Utilisateurs
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Gérez les comptes d'accès à l'application et suivez les statistiques d'activité.
          </p>
        </div>
      </div>

      {/* Statistics Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Comptes Actifs</span>
          <strong style={{ fontSize: '28px', color: 'var(--primary-dark)' }}>{users.length}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Utilisateurs configurés</span>
        </div>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Courriers Enregistrés</span>
          <strong style={{ fontSize: '28px', color: 'var(--primary-dark)' }}>{totalRegistered}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Depuis le lancement locale</span>
        </div>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Utilisateur le plus Actif</span>
          <strong style={{ fontSize: '20px', color: 'var(--primary-dark)', height: '34px', display: 'flex', alignItems: 'center' }}>
            {mostActiveUser}
          </strong>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {maxRegistrations > 0 ? `${maxRegistrations} enregistrement(s)` : 'Aucune activité'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
        
        {/* Left Card: Users List with inline edit capabilities */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
            Liste des Comptes
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', paddingBottom: '12px' }}>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nom Complet</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identifiant</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mot de passe</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rôle / Accès</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Enreg.</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Actions Eff.</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.username === currentUser.username;
                  const isEditing = editingUsername === u.username;
                  const stats = getUserStats(u.username, u.fullName);
                  
                  if (isEditing) {
                    return (
                      <tr key={u.username} style={{ borderBottom: '1px solid var(--surface-border)', backgroundColor: 'rgba(238, 238, 238, 0.4)' }}>
                        <td style={{ padding: '10px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={editFullName} 
                            onChange={e => setEditFullName(e.target.value)} 
                            style={{ padding: '6px 8px', fontSize: '13px', width: '120px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 4px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          {u.username}
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={editPassword} 
                            onChange={e => setEditPassword(e.target.value)} 
                            style={{ padding: '6px 8px', fontSize: '13px', width: '100px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 4px' }}>
                          <select 
                            className="form-control" 
                            value={editRole} 
                            onChange={e => setEditRole(e.target.value)}
                            style={{ padding: '6px 4px', fontSize: '12px', width: '110px' }}
                          >
                            <option value="READER">Lecteur</option>
                            <option value="AGENT">Agent BO</option>
                            <option value="ADMIN">Administrateur</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 4px', textAlign: 'center', fontSize: '13px' }}>
                          {stats.registeredCount}
                        </td>
                        <td style={{ padding: '10px 4px', textAlign: 'center', fontSize: '13px' }}>
                          {stats.actionsCount}
                        </td>
                        <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => saveEdit(u.username)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                backgroundColor: 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '600'
                              }}
                            >
                              Sauver
                            </button>
                            <button
                              onClick={() => setEditingUsername(null)}
                              style={{
                                padding: '5px 10px',
                                fontSize: '11px',
                                backgroundColor: 'var(--bg-main)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--surface-border)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '600'
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const badgeStyle = getRoleBadgeStyle(u.role);
                  return (
                    <tr key={u.username} style={{ borderBottom: '1px solid var(--surface-border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '14px 8px', fontSize: '13.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                        {u.fullName} {isSelf && <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--accent)', marginLeft: '4px' }}>(Vous)</span>}
                      </td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {u.username}
                      </td>
                      <td style={{ padding: '14px 8px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        ••••••
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <span className="badge" style={{ ...badgeStyle, padding: '4px 8px', borderRadius: '12px', fontSize: '10.5px', fontWeight: '600' }}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'center', fontSize: '13.5px', fontWeight: '600' }}>
                        {stats.registeredCount}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'center', fontSize: '13.5px', fontWeight: '600' }}>
                        {stats.actionsCount}
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => startEdit(u)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              backgroundColor: 'var(--bg-main)',
                              color: 'var(--primary)',
                              border: '1px solid var(--surface-border)',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: '600'
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            disabled={isSelf}
                            onClick={async () => {
                              const confirmed = await showConfirm(
                                `Voulez-vous vraiment supprimer définitivement le compte de ${u.fullName} ?`,
                                'Supprimer le compte',
                                'confirm-delete',
                                'Supprimer',
                                'Annuler'
                              );
                              if (confirmed) {
                                onDeleteUser(u.username);
                              }
                            }}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              backgroundColor: isSelf ? 'transparent' : 'rgba(231, 76, 60, 0.08)',
                              color: isSelf ? 'var(--text-muted)' : 'var(--danger)',
                              border: 'none',
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: '600'
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: User Creation Form */}
        <div className="card" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-dark)', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
            Créer un Nouvel Utilisateur
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Nom Complet *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Mohamed Ali"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Nom d'utilisateur (Identifiant) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: mohamed.ali"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Mot de passe *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Saisir le mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{ padding: '8px 12px', fontSize: '14px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Privilège / Rôle d'accès</label>
              <select
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                <option value="READER">Lecteur (Lecture Seule)</option>
                <option value="AGENT">Agent Bureau d'Ordre</option>
                <option value="ADMIN">Administrateur Système</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                marginTop: '10px',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              <PlusIcon size={16} /> Créer le compte
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
