import React, { useState } from 'react';
import './tournament.css';

function GroupSetup({ setNumPlayers, setGroups, setStartDate, setTournamentName, nextStep }) {
  const [players, setPlayers] = useState(4);
  const [numGroups, setNumGroups] = useState(2);
  const [groupConfig, setGroupConfig] = useState(Array(numGroups).fill(0));
  const [error, setError] = useState('');
  const [startDate, setStartDateState] = useState(''); // New state for start date
  const [tournamentName, setTournamentNameState] = useState(''); // New state for start date

  const handlePlayersChange = (e) => {
    const playerCount = Number(e.target.value);
    setPlayers(playerCount);
    setGroupConfig(Array(numGroups).fill(Math.floor(playerCount / numGroups)));
  };

  const handleGroupsChange = (e) => {
    const groupCount = Number(e.target.value);
    setNumGroups(groupCount);
    setGroupConfig(Array(groupCount).fill(Math.floor(players / groupCount)));
  };

  const handleStartDateChange = (e) => {
    setStartDateState(e.target.value);
  };

  const handleTournamentNameChange = (e) => {
    setTournamentNameState(e.target.value);
  };

  const handleSubmit = () => {


    const totalPlayersInGroups = groupConfig.reduce((sum, num) => sum + num, 0);
    if (totalPlayersInGroups !== players) {
      setError("Total number of players in groups must equal the number of players.");
      return;
    }

    if (!startDate) {
      setError("Please select a start date.");
      return;
    }

    setError('');
    setNumPlayers(players);
    setGroups(groupConfig);
    setStartDate(startDate); // Pass startDate to parent
    setTournamentName(tournamentName);
    nextStep();
  };

  return (
    <div>
      <h2>Group Setup</h2>
      <label>
        Number of Players:
        <input
          className="input"
          type="number"
          value={players}
          onChange={handlePlayersChange}
          min="2"
        />
      </label>
      <br />
      <label>
        Number of Groups:
        <input
          className="input"
          type="number"
          value={numGroups}
          onChange={handleGroupsChange}
          min="1"
        />
      </label>
      <br />
      {groupConfig.map((groupSize, index) => (
        <div key={index}>
          <label>
            Number of Players in Group {index + 1}:
            <input
              className="input"
              type="number"
              value={groupSize}
              onChange={(e) => {
                const newGroupConfig = [...groupConfig];
                newGroupConfig[index] = Number(e.target.value);
                setGroupConfig(newGroupConfig);
              }}
              min="0"
            />
          </label>
        </div>
      ))}
      <br />
      <label>
        Tournament Name:
        <input
          className="input"
          type="text"
          value={tournamentName}
          onChange={handleTournamentNameChange}
        />
      </label>
      <br />
      <label>
        Tournament Start Date:
        <input
          className="input"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
        />
      </label>
      <br />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSubmit}>Next</button>
    </div>
  );
}

export default GroupSetup;
