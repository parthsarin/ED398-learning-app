import React, { FunctionComponent } from 'react';

interface Props {
    passage: string,
    displayUpTo?: number,
}

const Passage: FunctionComponent<Props> = ({ passage, displayUpTo }) => {
    const pieces = passage.split(/(?<=\.*[?.!] )/g);
    const displayChunks = displayUpTo ? pieces.slice(0, displayUpTo) : pieces;

    return (
        <div className="passage-box">
            {
                displayChunks.map((sentence, idx) => 
                    (<p key={`sentence-${idx}`}>{sentence}</p>)
                )
            }
        </div>
    );
}

export default Passage;