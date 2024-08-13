import React from 'react';

const DrawList = ({ draws, visibleDraws, handleDrawSelect, handleShowMore, showMore }) => {
    return (
        <div>
            {draws.slice(0, visibleDraws).map(draw => (
                <div key={draw.id} onClick={() => handleDrawSelect(draw)}>
                    {draw.draw_name} - {new Date(draw.created_at).toLocaleDateString()}
                </div>
            ))}
            {showMore && <button onClick={handleShowMore}>Show More</button>}
        </div>
    );
};

export default DrawList;
