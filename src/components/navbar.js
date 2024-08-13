import React, { useState } from 'react';

import Login from './login';
import PlayersForm from './players';
import SinglesDraw from './singlesDraw';
import UpdateDraw from './updateDraw';
import Ongoing from './ongoing';
import Results from './results';
import Stats from './stats';
import '../style/navbar.css'; // Import CSS for Navbar styling
import MatchData from './matchData';
import Main from '../components/roundRobin/main';
import MatchesDisplay from '../components/roundRobin/matchesDisplay';
import ViewDraws from '../components/roundRobin/viewDraws';
import DisplayGroup from './roundRobin/displayGroup';

function Navbar() {
  const [activeTab, setActiveTab] = useState('displaygroup');
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setActiveTab('view'); // Set the active tab to 'players' after successful login
  };

  return (
    <div>
      <nav className="navbar">

      <li className={activeTab === 'displaygroup' ? 'active' : ''} onClick={() => setActiveTab('displaygroup')}>League</li>
      <li className={activeTab === 'roundview' ? 'active' : ''} onClick={() => setActiveTab('roundview')}>League Group</li>
      {isLoggedIn &&<li className={activeTab === 'main' ? 'active' : ''} onClick={() => setActiveTab('main')}>Create League</li>}
      {isLoggedIn && <li className={activeTab === 'view' ? 'active' : ''} onClick={() => setActiveTab('view')}>Update League</li>}

        <li className={activeTab === 'ongoing' ? 'active' : ''} onClick={() => setActiveTab('ongoing')}>Singles</li>
        {isLoggedIn && <li className={activeTab === 'singlesdraw' ? 'active' : ''} onClick={() => setActiveTab('singlesdraw')}>Create Draw</li>}
        {isLoggedIn && <li className={activeTab === 'updateDraw' ? 'active' : ''} onClick={() => setActiveTab('updateDraw')}>Update Draw</li>}
        <li className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>Results</li>
        <li className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Stats</li>

        {!isLoggedIn && <li className={activeTab === 'login' ? 'active' : ''} onClick={() => setActiveTab('login')}>Login</li>}
        {isLoggedIn && <li className={activeTab === 'players' ? 'active' : ''} onClick={() => setActiveTab('players')}>Players</li>}

      </nav>
      {activeTab === 'ongoing' && <Ongoing />}
      {activeTab === 'results' && <Results />}
      {activeTab === 'stats' && <Stats />}
      {activeTab === 'main' && <Main />}
      {activeTab === 'roundview' && <MatchesDisplay />}
      {activeTab === 'view' && <ViewDraws />}
      {activeTab === 'displaygroup' && <DisplayGroup />}


      {isLoggedIn && (
        <>
          {activeTab === 'players' && <PlayersForm />}
          {activeTab === 'singlesdraw' && <SinglesDraw />}
          {activeTab === 'updateDraw' && <UpdateDraw />}
          {activeTab === 'matchData' && <MatchData />}

        </>
      )}
      {!isLoggedIn && activeTab === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}

export default Navbar;
