import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SPORTS = [
  { value: 'table_tennis', label: 'Table Tennis', icon: '🏓', color: 'text-red-500', bgColor: 'bg-red-500' },
  { value: 'badminton', label: 'Badminton', icon: '🏸', color: 'text-lime-400', bgColor: 'bg-lime-400' },
  { value: 'volleyball', label: 'Volleyball', icon: '🏐', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { value: 'tennis', label: 'Tennis', icon: '🎾', color: 'text-green-500', bgColor: 'bg-green-500' },
  { value: 'pickleball', label: 'Pickleball', icon: '🥒', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
];

export const FORMATS = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'groups_knockout', label: 'Groups + Knockout' },
];

export const PARTICIPANT_TYPES = [
  { value: 'single', label: 'Singles' },
  { value: 'pair', label: 'Pairs/Doubles' },
  { value: 'team', label: 'Teams' },
];

export const ROLES = ['viewer', 'scorekeeper', 'admin'];

export const getSportInfo = (sport) => {
  return SPORTS.find(s => s.value === sport) || SPORTS[0];
};

export const formatSport = (sport) => {
  const info = getSportInfo(sport);
  return info ? info.label : sport?.replace('_', ' ');
};

export const getSportColor = (sport) => {
  const info = getSportInfo(sport);
  return info ? info.color : 'text-blue-500';
};

export const getSportBgColor = (sport) => {
  const info = getSportInfo(sport);
  return info ? info.bgColor : 'bg-blue-500';
};

export const getSportIcon = (sport) => {
  const info = getSportInfo(sport);
  return info ? info.icon : '🎯';
};

export const formatFormat = (format) => {
  const info = FORMATS.find(f => f.value === format);
  return info ? info.label : format?.replace('_', ' ');
};

export const formatStatus = (status) => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'draw_generated': return 'Draw Ready';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'pending': return 'Pending';
    case 'scheduled': return 'Scheduled';
    case 'live': return 'Live';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'live':
    case 'in_progress':
      return 'bg-red-500 text-white animate-pulse';
    case 'draw_generated':
    case 'scheduled':
      return 'bg-blue-500 text-white';
    case 'completed':
      return 'bg-green-600 text-white';
    case 'draft':
    case 'pending':
      return 'bg-zinc-700 text-zinc-300';
    case 'cancelled':
      return 'bg-zinc-800 text-zinc-500';
    default:
      return 'bg-zinc-700 text-zinc-300';
  }
};

export const canUserPerform = (user, action) => {
  if (!user) return false;
  const role = user.role;
  
  const permissions = {
    'view': ['viewer', 'scorekeeper', 'admin'],
    'score': ['scorekeeper', 'admin'],
    'assign': ['scorekeeper', 'admin'],
    'admin': ['admin'],
  };
  
  return permissions[action]?.includes(role) || false;
};

export const getPlayerName = (player) => {
  if (!player) return 'TBD';
  if (player.name) return player.name;
  return `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown';
};
