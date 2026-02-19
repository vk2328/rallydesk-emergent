import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const getSportColor = (sport) => {
  switch (sport) {
    case 'table_tennis':
      return 'text-table-tennis';
    case 'badminton':
      return 'text-badminton';
    default:
      return 'text-blue-500';
  }
};

export const getSportBgColor = (sport) => {
  switch (sport) {
    case 'table_tennis':
      return 'bg-table-tennis';
    case 'badminton':
      return 'bg-badminton';
    default:
      return 'bg-blue-500';
  }
};

export const formatSport = (sport) => {
  switch (sport) {
    case 'table_tennis':
      return 'Table Tennis';
    case 'badminton':
      return 'Badminton';
    default:
      return sport;
  }
};

export const formatFormat = (format) => {
  switch (format) {
    case 'single_elimination':
      return 'Single Elimination';
    case 'double_elimination':
      return 'Double Elimination';
    case 'round_robin':
      return 'Round Robin';
    default:
      return format;
  }
};

export const formatMatchType = (type) => {
  switch (type) {
    case 'singles':
      return 'Singles';
    case 'doubles':
      return 'Doubles';
    default:
      return type;
  }
};

export const formatStatus = (status) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'registration':
      return 'Registration';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'in_progress':
      return 'bg-red-500 text-white';
    case 'registration':
      return 'bg-blue-500 text-white';
    case 'completed':
      return 'bg-zinc-700 text-zinc-300';
    case 'draft':
      return 'bg-zinc-800 text-zinc-400';
    case 'pending':
      return 'bg-yellow-600 text-white';
    default:
      return 'bg-zinc-700 text-zinc-300';
  }
};
