import React, { createContext, useContext, useState } from 'react';

const TournamentContext = createContext(null);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};

export const TournamentProvider = ({ children }) => {
  const [currentTournament, setCurrentTournament] = useState(null);

  return (
    <TournamentContext.Provider value={{ currentTournament, setCurrentTournament }}>
      {children}
    </TournamentContext.Provider>
  );
};
