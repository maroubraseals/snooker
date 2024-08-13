import React, { useState } from 'react';
import GroupSetup from './groupSetup';
import PlayerSetup from './playerSetup';
import Tournament from './tournament';


function Main() {
  const [step, setStep] = useState(0);
  const [numPlayers, setNumPlayers] = useState(0);
  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [tournamentName, setTournamentName] = useState('');

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div>
      {step === 0 && (
        <GroupSetup
          setNumPlayers={setNumPlayers}
          setGroups={setGroups}
          setStartDate={setStartDate}
          setTournamentName={setTournamentName}
          nextStep={nextStep}
        />
      )}
      {step === 1 && (
        <PlayerSetup
          numPlayers={numPlayers}
          setPlayers={setPlayers}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}
      {step === 2 && (
        <Tournament
          groups={groups}
          players={players}
          startDate={startDate} 
          tournamentName={tournamentName}
          prevStep={prevStep}
        />
      )}
    </div>
  );
}

export default Main;
