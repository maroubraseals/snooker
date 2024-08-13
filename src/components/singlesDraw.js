import React, { useState, useEffect } from "react";
import "../style/singlesDraw.css"; // Import CSS file
import supabase from './supabase'; // Import your Supabase client

const SinglesDraw = () => {
    const [players, setPlayers] = useState([]);
    const [bracket, setBracket] = useState([]);
    const [showHandicap, setShowHandicap] = useState(false);
    const [tournamentName, setTournamentName] = useState("");
    const [error, setError] = useState(null);
    const [completeData, setCompleteData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [bestOfOptions, setBestOfOptions] = useState([]);

    useEffect(() => {
        refreshPlayers();
    }, []);

    const generateBracket = () => {
        if (!tournamentName.trim()) {
            alert("Please enter a tournament name before generating the bracket.");
            return;
        }

        const availablePlayers = [...players];
        const round1Matches = isPowerOfTwo(availablePlayers.length) ? availablePlayers.length / 2 : Math.pow(2, Math.ceil(Math.log2(availablePlayers.length))) / 2;

        const newBracket = [{ round: 1, matches: [] }];
        const shuffledPlayers = shuffleArray(availablePlayers);

        for (let i = 0; i < round1Matches; i++) {
            const player = shuffledPlayers.pop();
            const playerName = player ? player.name : '';
            const playerHandicap = player ? player.handicap : '';

            newBracket[0].matches.push({
                subBoxes: [
                    { playerName, handicap: playerHandicap, score: 0, result: null, isWinner: false },
                    { playerName: '', handicap: '', score: 0, result: null, isWinner: false }
                ]
            });
        }

        while (shuffledPlayers.length > 0) {
            const player = shuffledPlayers.pop();
            const playerName = player ? player.name : '';
            const playerHandicap = player ? player.handicap : '';

            let randomMatchIndex = Math.floor(Math.random() * round1Matches);
            let subBoxIndex = Math.floor(Math.random() * 2);
            while (newBracket[0].matches[randomMatchIndex].subBoxes[subBoxIndex].playerName !== '') {
                randomMatchIndex = Math.floor(Math.random() * round1Matches);
                subBoxIndex = Math.floor(Math.random() * 2);
            }

            newBracket[0].matches[randomMatchIndex].subBoxes[subBoxIndex].playerName = playerName;
            newBracket[0].matches[randomMatchIndex].subBoxes[subBoxIndex].handicap = playerHandicap;
        }

        const totalRounds = Math.ceil(Math.log2(round1Matches * 2));
        for (let round = 2; round <= totalRounds; round++) {
            const roundMatches = [];
            const numMatches = Math.pow(2, totalRounds - round);
            for (let i = 0; i < numMatches; i++) {
                roundMatches.push({
                    subBoxes: [
                        { playerName: '', handicap: '', score: 0, result: null, isWinner: false },
                        { playerName: '', handicap: '', score: 0, result: null, isWinner: false }
                    ]
                });
            }
            newBracket.push({ round, matches: roundMatches });
        }

        setBracket(newBracket);
    };

    const isPowerOfTwo = (num) => num !== 0 && (num & (num - 1)) === 0;

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const handleBestOfChange = (e, roundIndex) => {
        const value = e.target.value;
        setBestOfOptions(prevOptions => {
            const updatedOptions = [...prevOptions];
            updatedOptions[roundIndex] = value;
            return updatedOptions;
        });
    };

    const renderBracket = () => (
        <div className="bracket-container">
            {bracket.map((roundData, roundIndex) => (
                <div key={roundIndex} className="round-container" style={{ marginBottom: `${20 * roundIndex}px` }}>
                    <h3>Round {roundData.round}</h3>
                    <label>
                        Best of:
                        <select
                            value={bestOfOptions[roundIndex] || ''}
                            onChange={(e) => handleBestOfChange(e, roundIndex)}
                        >
                            <option value="">Select...</option>
                            <option value="1">1</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                        </select>
                    </label>
                    {roundData.matches.map((match, matchIndex) => (
                        <div key={matchIndex} className="match-container">
                            {match.subBoxes.map((subBox, subBoxIndex) => (
                                <div key={subBoxIndex} className="sub-box">
                                    <span>
                                        {subBox.playerName} {showHandicap && subBox.handicap !== '' && `[${subBox.handicap}]`}
                                    </span>
                                    <input
                                        className="score-input"
                                        value={subBox.score || ''}
                                        onChange={(e) => handleInputChange(e, roundIndex, matchIndex, subBoxIndex, 'score')}
                                        placeholder="Score"
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

    const handleInputChange = (e, roundIndex, matchIndex, subBoxIndex, field) => {
        const value = e.target.value;
        setBracket(prevBracket => {
            const updatedBracket = [...prevBracket];
            updatedBracket[roundIndex].matches[matchIndex].subBoxes[subBoxIndex][field] = value;

            const allScoresEntered = updatedBracket[roundIndex].matches[matchIndex].subBoxes.every(player => player.score !== '');

            if (allScoresEntered || updatedBracket[roundIndex].matches[matchIndex].subBoxes.length === 1) {
                const player1 = updatedBracket[roundIndex].matches[matchIndex].subBoxes[0];
                const player2 = updatedBracket[roundIndex].matches[matchIndex].subBoxes[1];

                if (player1 && player2 && player1.score !== undefined && player2.score !== undefined) {
                    const player1Score = parseInt(player1.score);
                    const player2Score = parseInt(player2.score);

                    const winnerIndex = player1Score > player2Score ? 0 : 1;
                    const loserIndex = winnerIndex === 0 ? 1 : 0;

                    updatedBracket[roundIndex].matches[matchIndex].subBoxes[winnerIndex].isWinner = true;
                    updatedBracket[roundIndex].matches[matchIndex].subBoxes[loserIndex].isWinner = false;

                    if (roundIndex < bracket.length - 1) {
                        const nextRoundIndex = roundIndex + 1;
                        const nextMatchIndex = Math.floor(matchIndex / 2);
                        const nextSubBoxIndex = matchIndex % 2;

                        if (nextMatchIndex < updatedBracket[nextRoundIndex].matches.length) {
                            updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex] = { ...updatedBracket[roundIndex].matches[matchIndex].subBoxes[winnerIndex] };
                            updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].score = '';
                            updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].isWinner = false;
                        }
                    }
                } else if (updatedBracket[roundIndex].matches[matchIndex].subBoxes.length === 1) {
                    if (roundIndex < bracket.length - 1) {
                        const nextRoundIndex = roundIndex + 1;
                        const nextMatchIndex = Math.floor(matchIndex / 2);
                        const nextSubBoxIndex = matchIndex % 2;

                        updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex] = { ...updatedBracket[roundIndex].matches[matchIndex].subBoxes[0] };
                        updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].score = '';
                        updatedBracket[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].isWinner = false;
                    }
                }
            }

            return updatedBracket;
        });
    };

    const refreshPlayers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('players').select('*').eq('availability', true);
            if (error) throw new Error("Failed to fetch players");

            const playersWithAllFields = data.map(player => ({
                id: player.id,
                name: player.name,
                handicap: player.handicap,
                availability: player.availability
            }));

            setPlayers(playersWithAllFields);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching players:", error.message);
            setError(error.message);
            setLoading(false);
        }
    };

    const captureDrawProgress = async () => {
        if (!tournamentName.trim()) {
            alert("Please enter a tournament name.");
            return;
        }

        const draw = bracket;
        const draw_name = tournamentName;
        const best_of = bestOfOptions;

        try {
            setLoading(true);
            const { error } = await supabase.from('knockoutdraw').insert([{ draw_name, draw, best_of }]);
            if (error) throw new Error("Error capturing draw progress");

            setCompleteData(true);
            setLoading(false);
        } catch (error) {
            console.error("Error capturing draw progress:", error.message);
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div>
            <h3>Enter Tournament Name</h3>
            <input
                className="draw-form-input"
                type="text"
                placeholder="Enter tournament name"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
            />
            <button onClick={generateBracket}>Generate Bracket</button>
            <label>
                Show Handicap:
                <input
                    className="form-checkbox"
                    type="checkbox"
                    checked={showHandicap}
                    onChange={() => setShowHandicap(!showHandicap)}
                />
            </label>
            {renderBracket()}
            {completeData && <p>Success message: Online Submitted</p>}
            {error && <p>Error message: {error}</p>}
            <button onClick={captureDrawProgress} disabled={loading}>
                {loading ? "Loading..." : "Submit Online"}
            </button>
        </div>
    );
};

export default SinglesDraw;
