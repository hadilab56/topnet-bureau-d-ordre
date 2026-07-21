// formatting utilities and lists

export const DEPARTMENTS = [
  { id: 'FINANCE', name: 'Direction Financière & Comptabilité', code: 'FIN' },
  { id: 'RH', name: 'Ressources Humaines', code: 'RH' },
  { id: 'TECH', name: 'Direction Technique & Réseau', code: 'TECH' },
  { id: 'COMMERCIAL', name: 'Direction Commerciale & Client', code: 'COM' },
  { id: 'JURIDIQUE', name: 'Direction Affaires Juridiques', code: 'JUR' },
  { id: 'SECRETARIAT', name: 'Secrétariat Général / DG', code: 'SEC' }
];

export const CATEGORIES = [
  { id: 'FACTURE', name: 'Facture / Paiement' },
  { id: 'CONTRAT', name: 'Contrat / Convention' },
  { id: 'RECLAMATION', name: 'Réclamation Client' },
  { id: 'COURRIER', name: 'Courrier Administratif Officiel' },
  { id: 'RAPPORT', name: 'Rapport d\'Activité' },
  { id: 'OFFRE', name: 'Offre Commerciale / Appel d\'offres' },
  { id: 'AUTRE', name: 'Autre Document' }
];


export const STATUSES = [
  { id: 'RECEIVED', name: 'Reçu (Entrée)', color: '#0078d4', bg: '#deecf9' },
  { id: 'HOLD', name: 'En Attente de Départ (Hold)', color: '#d9534f', bg: '#fdf2f2' },
  { id: 'DELIVERED', name: 'Sorti / Traité', color: '#107c41', bg: '#dfefe3' }
];

export const generateReference = (type, sequenceNum, year = new Date().getFullYear()) => {
  const code = type === 'INCOMING' ? 'ARR' : 'DEP';
  const paddedSeq = String(sequenceNum).padStart(4, '0');
  return `TNET-BO/${year}/${code}-${paddedSeq}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusDetails = (statusId) => {
  return STATUSES.find(s => s.id === statusId) || { name: statusId, color: '#333', bg: '#eee' };
};


export const getDepartmentName = (deptId) => {
  return DEPARTMENTS.find(d => d.id === deptId)?.name || deptId;
};

export const getCategoryName = (catId) => {
  return CATEGORIES.find(c => c.id === catId)?.name || catId;
};
