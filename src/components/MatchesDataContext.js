// MatchesDataContext.js
import React, { createContext, useContext, useState } from 'react';

const MatchesDataContext = createContext();

export const useMatchesData = () => useContext(MatchesDataContext);

export const MatchesDataProvider = ({ children }) => {
    const [matchesData, setMatchesData] = useState({});

    const updateMatchData = (matchId, updatedData) => {
        setMatchesData(prevData => ({
            ...prevData,
            [matchId]: updatedData
        }));
    };

    const deleteMatchData = (matchId) => {
        const { [matchId]: deletedMatch, ...restMatches } = matchesData;
        setMatchesData(restMatches);
    };

    return (
        <MatchesDataContext.Provider value={{ matchesData, updateMatchData, deleteMatchData }}>
            {children}
        </MatchesDataContext.Provider>
    );
};
